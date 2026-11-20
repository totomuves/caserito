-- =========================================================
-- CASERITO · 012 · Avisos push en Spanglish para turistas
-- (antes llegaban en inglés). Requiere haber corrido el 008.
-- Pegar completo en SQL Editor → Run (una vez).
-- =========================================================
create or replace function caserito.avisar_drops()
returns int language plpgsql security definer set search_path = caserito, extensions, public as $$
declare
  d record;
  mensajes jsonb;
  total int := 0;
  hora int := extract(hour from now() at time zone 'America/Santiago');
begin
  for d in
    select dr.id, dr.titulo, dr.frase, dr.frase_aprobada, dr.cupo, dr.tipo, l.nombre, l.ubicacion, l.dueno_id
      from caserito.drops dr join caserito.locales l on l.id = dr.local_id
     where dr.avisado_at is null and dr.inicia_at <= now()
       and dr.termina_at > now() + interval '10 minutes'
       and l.aprobado and l.activo
     for update of dr skip locked
  loop
    update caserito.drops set avisado_at = now() where id = d.id;
    continue when hora >= 22 or hora < 9;     -- de noche no se molesta a nadie

    with destinatarios as (
      select a.usuario_id, a.token, a.idioma,
             greatest(1, round(st_distance(a.ubicacion, d.ubicacion) / 100))::int as cuadras
        from caserito.avisos_push a
       where a.activo and a.ubicacion is not null
         and a.ubicado_at > now() - interval '7 days'
         and a.usuario_id <> d.dueno_id
         and st_dwithin(a.ubicacion, d.ubicacion, 1500)
         and (select count(*) from caserito.avisos_enviados e
               where e.usuario_id = a.usuario_id and e.enviado_at > now() - interval '24 hours') < 3
       limit 2000
    ), anotados as (
      insert into caserito.avisos_enviados (usuario_id, drop_id)
      select usuario_id, d.id from destinatarios
      on conflict do nothing
      returning usuario_id
    )
    select jsonb_agg(jsonb_build_object(
             'to', x.token,
             'sound', 'default',
             'title', case when x.idioma = 'sp' then '¡Drop en ' || d.nombre || '! New deal nearby' else '¡Drop en ' || d.nombre || '!' end,
             'body', case when x.idioma = 'sp'
                       then coalesce(case when d.frase_aprobada then d.frase end, case when d.tipo = 'sorpresa' then 'Caja sorpresa (mystery box)' else d.titulo end)
                            || ' · quedan ' || d.cupo || ' · a ' || x.cuadras || case when x.cuadras = 1 then ' cuadra' else ' cuadras' end
                            || ' (~' || (x.cuadras * 100) || ' m)'
                       else coalesce(case when d.frase_aprobada then d.frase end, case when d.tipo = 'sorpresa' then 'Caja sorpresa' else d.titulo end)
                            || ' · quedan ' || d.cupo || ' · a ' || x.cuadras || case when x.cuadras = 1 then ' cuadra' else ' cuadras' end
                     end,
             'data', jsonb_build_object('drop_id', d.id)))
      into mensajes
      from destinatarios x join anotados n on n.usuario_id = x.usuario_id;

    if mensajes is not null then
      -- Expo acepta hasta 100 mensajes por envío
      for i in 0 .. (jsonb_array_length(mensajes) - 1) / 100 loop
        perform net.http_post(
          url := 'https://exp.host/--/api/v2/push/send',
          body := (select jsonb_agg(m) from (select m from jsonb_array_elements(mensajes) with ordinality as t(m, n)
                                              where n > i * 100 and n <= (i + 1) * 100) s),
          headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
        );
      end loop;
      total := total + jsonb_array_length(mensajes);
    end if;
  end loop;
  return total;
end $$;
revoke all on function caserito.avisar_drops() from public, anon, authenticated;

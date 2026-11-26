-- =========================================================
-- DROPPER · 033 · Estadísticas por drop y seguir locales
-- 1) Cada drop cuenta personas que lo vieron, que apretaron "Cómo
--    llegar" y que lo compartieron (una vez por persona).
-- 2) Los caseritos pueden seguir locales (♥): les llega aviso
--    cuando ese local suelta un drop, aunque estén lejos.
-- 3) El panel muestra todo eso por drop, más los seguidores.
-- Pegar completo en SQL Editor → Run. Se puede correr más de una vez.
-- =========================================================

-- ---------- 1) Lo que pasa con cada drop ----------
create table if not exists caserito.eventos_drop (
  drop_id    uuid not null references caserito.drops(id) on delete cascade,
  usuario_id uuid not null default auth.uid(),
  tipo       text not null check (tipo in ('vista', 'como_llegar', 'compartir')),
  creado_at  timestamptz not null default now(),
  primary key (drop_id, usuario_id, tipo)
);
alter table caserito.eventos_drop enable row level security; -- nadie lo lee directo: solo las funciones

create or replace function caserito.registrar_evento(p_drop uuid, p_tipo text)
returns void language sql security definer set search_path = caserito, public as $$
  insert into caserito.eventos_drop (drop_id, usuario_id, tipo)
  select p_drop, auth.uid(), p_tipo
   where auth.uid() is not null and p_tipo in ('vista', 'como_llegar', 'compartir')
     and exists (select 1 from caserito.drops where id = p_drop)
  on conflict do nothing;
$$;
revoke all on function caserito.registrar_evento(uuid, text) from public, anon;
grant execute on function caserito.registrar_evento(uuid, text) to authenticated;

-- ---------- 2) Seguir locales ----------
create table if not exists caserito.seguidos (
  usuario_id uuid not null default auth.uid(),
  local_id   uuid not null references caserito.locales(id) on delete cascade,
  creado_at  timestamptz not null default now(),
  primary key (usuario_id, local_id)
);
create index if not exists seguidos_local_idx on caserito.seguidos (local_id);
alter table caserito.seguidos enable row level security;
drop policy if exists seguidos_propios on caserito.seguidos;
create policy seguidos_propios on caserito.seguidos for select using (usuario_id = auth.uid());
grant select on caserito.seguidos to authenticated;

create or replace function caserito.seguir_local(p_local uuid, p_seguir boolean default true)
returns boolean language plpgsql security definer set search_path = caserito, public as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if p_seguir then
    insert into caserito.seguidos (usuario_id, local_id) values (auth.uid(), p_local) on conflict do nothing;
  else
    delete from caserito.seguidos where usuario_id = auth.uid() and local_id = p_local;
  end if;
  return p_seguir;
end $$;
revoke all on function caserito.seguir_local(uuid, boolean) from public, anon;
grant execute on function caserito.seguir_local(uuid, boolean) to authenticated;

-- ---------- 3) Estadísticas para el panel ----------
create or replace function caserito.estadisticas_local(p_local uuid)
returns json language plpgsql stable security definer set search_path = caserito, public as $$
declare r json;
begin
  if not (caserito.es_admin() or caserito.tiene_permiso(p_local, 'resultados') or caserito.tiene_permiso(p_local, 'drops')) then
    raise exception 'No tienes acceso a las estadísticas de este local';
  end if;
  select json_build_object(
    'seguidores', (select count(*) from caserito.seguidos s where s.local_id = p_local),
    'drops', coalesce((
      select json_agg(x order by x.termina_at desc) from (
        select d.id, d.termina_at,
               (select count(*) from caserito.eventos_drop e where e.drop_id = d.id and e.tipo = 'vista')       as vistas,
               (select count(*) from caserito.eventos_drop e where e.drop_id = d.id and e.tipo = 'como_llegar') as como_llegar,
               (select count(*) from caserito.eventos_drop e where e.drop_id = d.id and e.tipo = 'compartir')   as compartidos,
               (select count(*) from caserito.participaciones p where p.drop_id = d.id)                          as pedidos,
               (select count(p.canjeado_at) from caserito.participaciones p where p.drop_id = d.id)              as canjes
          from caserito.drops d
         where d.local_id = p_local and d.termina_at > now() - interval '60 days'
      ) x), '[]'::json)
  ) into r;
  return r;
end $$;
revoke all on function caserito.estadisticas_local(uuid) from public, anon;
grant execute on function caserito.estadisticas_local(uuid) to authenticated;

-- ---------- 4) Avisos: los que siguen al local también se enteran ----------
create or replace function caserito.avisar_drops()
returns int language plpgsql security definer set search_path = caserito, extensions, public as $$
declare
  d record;
  mensajes jsonb;
  total int := 0;
  hora int := extract(hour from now() at time zone 'America/Santiago');
begin
  for d in
    select dr.id, dr.local_id, dr.titulo, dr.frase, dr.frase_aprobada, dr.cupo, dr.tipo, l.nombre, l.ubicacion, l.dueno_id
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
             case when a.ubicacion is null then null
                  else greatest(1, round(st_distance(a.ubicacion, d.ubicacion) / 100))::int end as cuadras,
             exists (select 1 from caserito.seguidos s where s.usuario_id = a.usuario_id and s.local_id = d.local_id) as sigue
        from caserito.avisos_push a
       where a.activo
         and a.usuario_id <> d.dueno_id
         and (
           (a.ubicacion is not null and a.ubicado_at > now() - interval '7 days' and st_dwithin(a.ubicacion, d.ubicacion, 1500))
           or exists (select 1 from caserito.seguidos s where s.usuario_id = a.usuario_id and s.local_id = d.local_id)
         )
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
             'title', case when x.sigue then '♥ ' else '' end
                      || case when x.idioma = 'sp' then '¡Drop en ' || d.nombre || '! New deal' else '¡Drop en ' || d.nombre || '!' end,
             'body', coalesce(case when d.frase_aprobada then d.frase end, case when d.tipo = 'sorpresa' then 'Caja sorpresa' else d.titulo end)
                     || ' · quedan ' || d.cupo
                     || coalesce(' · a ' || x.cuadras || case when x.cuadras = 1 then ' cuadra' else ' cuadras' end, ''),
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

notify pgrst, 'reload schema';

-- Prueba: debería mostrar los seguidores y los drops de los últimos 60 días del primer local
select caserito.estadisticas_local((select id from caserito.locales order by creado_at limit 1)) as prueba
 where caserito.es_admin();

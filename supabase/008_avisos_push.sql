-- =========================================================
-- CASERITO · 008 · Notificaciones push cuando se suelta un drop
-- Avisa a los caseritos que estuvieron cerca (≤ 15 cuadras) en
-- los últimos 7 días. Máximo 3 avisos por persona al día y nada
-- entre las 22:00 y las 9:00. Se envía por el servicio de Expo.
-- Pegar completo en SQL Editor → Run (una vez).
-- =========================================================
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------- Quién quiere avisos ----------
create table if not exists caserito.avisos_push (
  usuario_id     uuid primary key references caserito.perfiles(id) on delete cascade,
  token          text not null,
  plataforma     text,
  idioma         text not null default 'es' check (idioma in ('es','sp')),
  ubicacion      geography(point, 4326),
  ubicado_at     timestamptz,
  activo         boolean not null default true,
  actualizado_at timestamptz not null default now()
);
create index if not exists avisos_push_ubicacion_idx on caserito.avisos_push using gist (ubicacion);

create table if not exists caserito.avisos_enviados (
  usuario_id uuid not null references caserito.perfiles(id) on delete cascade,
  drop_id    uuid not null references caserito.drops(id) on delete cascade,
  enviado_at timestamptz not null default now(),
  primary key (usuario_id, drop_id)
);
create index if not exists avisos_enviados_fecha_idx on caserito.avisos_enviados (usuario_id, enviado_at);

alter table caserito.drops add column if not exists avisado_at timestamptz;
-- Los drops que ya existían no se avisan
update caserito.drops set avisado_at = now() where avisado_at is null;

alter table caserito.avisos_push     enable row level security;
alter table caserito.avisos_enviados enable row level security;
drop policy if exists avisos_propios_ver on caserito.avisos_push;
create policy avisos_propios_ver on caserito.avisos_push for select using (usuario_id = auth.uid());
grant select on caserito.avisos_push to authenticated;

-- ---------- Funciones para la app ----------
create or replace function caserito.guardar_aviso(p_token text, p_plataforma text, p_idioma text, p_lat float8 default null, p_lng float8 default null)
returns void language plpgsql security definer set search_path = caserito, extensions, public as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[.+\]$' then raise exception 'Token no válido'; end if;
  insert into caserito.avisos_push (usuario_id, token, plataforma, idioma, ubicacion, ubicado_at, activo, actualizado_at)
  values (auth.uid(), p_token, p_plataforma, coalesce(nullif(p_idioma,''),'es'),
          case when p_lat is not null then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end,
          case when p_lat is not null then now() end, true, now())
  on conflict (usuario_id) do update set
    token = excluded.token, plataforma = excluded.plataforma, idioma = excluded.idioma,
    ubicacion = coalesce(excluded.ubicacion, caserito.avisos_push.ubicacion),
    ubicado_at = coalesce(excluded.ubicado_at, caserito.avisos_push.ubicado_at),
    activo = true, actualizado_at = now();
  -- el mismo teléfono no puede quedar en dos cuentas
  delete from caserito.avisos_push where token = p_token and usuario_id <> auth.uid();
end $$;

create or replace function caserito.ubicar_aviso(p_lat float8, p_lng float8)
returns void language sql security definer set search_path = caserito, extensions, public as $$
  update caserito.avisos_push
     set ubicacion = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, ubicado_at = now()
   where usuario_id = auth.uid();
$$;

create or replace function caserito.apagar_avisos()
returns void language sql security definer set search_path = caserito, public as $$
  update caserito.avisos_push set activo = false, actualizado_at = now() where usuario_id = auth.uid();
$$;

revoke all on function caserito.guardar_aviso(text, text, text, float8, float8) from public, anon;
revoke all on function caserito.ubicar_aviso(float8, float8) from public, anon;
revoke all on function caserito.apagar_avisos() from public, anon;
grant execute on function caserito.guardar_aviso(text, text, text, float8, float8) to authenticated;
grant execute on function caserito.ubicar_aviso(float8, float8) to authenticated;
grant execute on function caserito.apagar_avisos() to authenticated;

-- ---------- El envío ----------
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
             'title', case when x.idioma = 'sp' then 'New drop at ' || d.nombre || '!' else '¡Drop en ' || d.nombre || '!' end,
             'body', case when x.idioma = 'sp'
                       then case when d.tipo = 'sorpresa' then 'Mystery box' else d.titulo end
                            || ' · ' || d.cupo || ' left · ' || x.cuadras || case when x.cuadras = 1 then ' block' else ' blocks' end || ' away'
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

-- Al soltar un drop que parte ahora, avisar al tiro
create or replace function caserito.avisar_al_soltar()
returns trigger language plpgsql security definer set search_path = caserito, public as $$
begin
  if new.inicia_at <= now() + interval '1 minute' then perform caserito.avisar_drops(); end if;
  return null;
end $$;
drop trigger if exists avisar_al_soltar on caserito.drops;
create trigger avisar_al_soltar after insert on caserito.drops
  for each row execute function caserito.avisar_al_soltar();

-- Drops programados para más tarde: se revisan cada minuto
select cron.unschedule('caserito-avisar-drops') where exists (select 1 from cron.job where jobname = 'caserito-avisar-drops');
select cron.schedule('caserito-avisar-drops', '* * * * *', 'select caserito.avisar_drops()');

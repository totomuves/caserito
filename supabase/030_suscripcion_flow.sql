-- =========================================================
-- DROPER · 030 · Suscripción mensual de los locales (Flow)
-- Cada local paga su plan mensual con tarjeta en Flow (cargo automático).
-- "gratis_hasta": meses de regalo (fundadores: 3 meses desde hoy).
-- El cobro parte APAGADO: mientras ajustes.cobro_activo = 'no', nadie queda bloqueado.
-- Cuando lo prendas, un local sin suscripción al día (y sin meses gratis) no puede publicar drops nuevos.
-- Pegar completo en SQL Editor → Run. Se puede correr más de una vez.
-- =========================================================
alter table caserito.locales add column if not exists gratis_hasta date;
-- Locales que ya existen = fundadores: 3 meses gratis desde hoy (solo si no tenían fecha)
update caserito.locales set gratis_hasta = (current_date + interval '3 months')::date where gratis_hasta is null;

create table if not exists caserito.suscripciones (
  local_id            uuid primary key references caserito.locales(id) on delete cascade,
  flow_customer_id    text,
  flow_subscription_id text,
  estado              text not null default 'sin_suscripcion', -- sin_suscripcion | tarjeta_pendiente | activa | morosa | cancelada
  tarjeta             text,                                    -- ej: "Visa ···· 4417"
  detalle             jsonb,                                   -- última respuesta de Flow (para revisar)
  actualizado_at      timestamptz not null default now()
);
alter table caserito.suscripciones enable row level security;
drop policy if exists suscripciones_ver on caserito.suscripciones;
create policy suscripciones_ver on caserito.suscripciones for select to authenticated
  using (caserito.es_dueno(local_id) or caserito.es_admin());
grant select on caserito.suscripciones to authenticated;
grant select, insert, update, delete on caserito.suscripciones to service_role;
grant select, update on caserito.locales to service_role;

insert into caserito.ajustes (clave, valor) values ('cobro_activo', 'no') on conflict (clave) do nothing;

-- ¿Este local puede publicar? (al día, con meses gratis, o cobro apagado)
create or replace function caserito.local_al_dia(p_local uuid)
returns boolean language sql stable security definer set search_path = caserito, public as $$
  select coalesce((select valor from caserito.ajustes where clave = 'cobro_activo'), 'no') <> 'si'
      or exists (select 1 from caserito.locales l where l.id = p_local and l.gratis_hasta >= current_date)
      or exists (select 1 from caserito.suscripciones s where s.local_id = p_local and s.estado = 'activa');
$$;
grant execute on function caserito.local_al_dia(uuid) to authenticated;

-- Para el panel: el estado de la suscripción de un local
create or replace function caserito.mi_suscripcion(p_local uuid)
returns jsonb language sql stable security definer set search_path = caserito, public as $$
  select case when not (caserito.es_dueno(p_local) or caserito.es_admin()) then null else jsonb_build_object(
    'estado', coalesce(s.estado, 'sin_suscripcion'),
    'tarjeta', s.tarjeta,
    'gratis_hasta', l.gratis_hasta,
    'al_dia', caserito.local_al_dia(p_local),
    'cobro_activo', coalesce((select valor from caserito.ajustes where clave = 'cobro_activo'), 'no') = 'si',
    'actualizado_at', s.actualizado_at
  ) end
  from caserito.locales l left join caserito.suscripciones s on s.local_id = l.id
  where l.id = p_local;
$$;
grant execute on function caserito.mi_suscripcion(uuid) to authenticated;

-- No se publican drops nuevos sin estar al día (solo si el cobro está prendido; el admin siempre puede)
create or replace function caserito.drops_exigir_suscripcion() returns trigger
language plpgsql security definer set search_path = caserito, public as $$
begin
  if auth.uid() is not null and not caserito.es_admin() and not caserito.local_al_dia(new.local_id) then
    raise exception 'Tu suscripción de Droper no está al día. Actívala en el panel → Mi suscripción.';
  end if;
  return new;
end $$;
drop trigger if exists drops_exigir_suscripcion on caserito.drops;
create trigger drops_exigir_suscripcion before insert on caserito.drops
for each row execute function caserito.drops_exigir_suscripcion();

-- Admin: regalar meses / ver todas / prender el cobro
create or replace function caserito.fijar_gratis_hasta(p_local uuid, p_fecha date)
returns void language plpgsql security definer set search_path = caserito, public as $$
begin
  if not caserito.es_admin() then raise exception 'Solo el admin'; end if;
  update caserito.locales set gratis_hasta = p_fecha where id = p_local;
end $$;
grant execute on function caserito.fijar_gratis_hasta(uuid, date) to authenticated;

create or replace function caserito.fijar_cobro(p_activo boolean)
returns boolean language plpgsql security definer set search_path = caserito, public as $$
begin
  if not caserito.es_admin() then raise exception 'Solo el admin'; end if;
  insert into caserito.ajustes (clave, valor, actualizado_at) values ('cobro_activo', case when p_activo then 'si' else 'no' end, now())
  on conflict (clave) do update set valor = excluded.valor, actualizado_at = now();
  return p_activo;
end $$;
grant execute on function caserito.fijar_cobro(boolean) to authenticated;

create or replace function caserito.suscripciones_admin()
returns table (local_id uuid, nombre text, gratis_hasta date, estado text, tarjeta text, al_dia boolean, actualizado_at timestamptz)
language sql stable security definer set search_path = caserito, public as $$
  select l.id, l.nombre, l.gratis_hasta, coalesce(s.estado, 'sin_suscripcion'), s.tarjeta, caserito.local_al_dia(l.id), s.actualizado_at
  from caserito.locales l left join caserito.suscripciones s on s.local_id = l.id
  where caserito.es_admin() and l.aprobado
  order by l.nombre;
$$;
grant execute on function caserito.suscripciones_admin() to authenticated;

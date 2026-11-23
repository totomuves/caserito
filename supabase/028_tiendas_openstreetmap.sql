-- =========================================================
-- DROPER · 028 · Tiendas de OpenStreetMap
-- El admin trae desde OpenStreetMap las tiendas de un barrio o de un mall.
-- Sirven para: (1) que el mapa y los planos ya vengan con tiendas (puntos grises,
-- "aún no está en Droper"), (2) armar el plano base de un mall con sus pisos,
-- y (3) tener la lista de locales para invitar.
-- Pegar completo en SQL Editor → Run (una vez). Requiere el SQL 026.
-- =========================================================
create table if not exists caserito.tiendas_osm (
  osm_id         text primary key,                 -- 'node/123' o 'way/456'
  nombre         text not null,
  tipo           text,                             -- shop=… o amenity=… de OpenStreetMap
  lat            double precision not null,
  lng            double precision not null,
  nivel          int,                              -- piso según OpenStreetMap (si viene)
  direccion      text,
  telefono       text,
  web            text,
  barrio_id      text references caserito.barrios(id) on delete set null,
  lugar_id       uuid references caserito.lugares(id) on delete set null,
  piso_id        uuid references caserito.pisos(id) on delete set null,
  plano_x        double precision check (plano_x between 0 and 1),
  plano_y        double precision check (plano_y between 0 and 1),
  local_id       uuid references caserito.locales(id) on delete set null, -- ya está en Droper
  oculta         boolean not null default false,  -- el admin la esconde (cerró, dato malo)
  actualizado_at timestamptz not null default now()
);
create index if not exists tiendas_osm_barrio_idx on caserito.tiendas_osm (barrio_id);
create index if not exists tiendas_osm_lugar_idx on caserito.tiendas_osm (lugar_id);

alter table caserito.tiendas_osm enable row level security;
drop policy if exists tiendas_osm_ver on caserito.tiendas_osm;
create policy tiendas_osm_ver on caserito.tiendas_osm for select using (true);
drop policy if exists tiendas_osm_admin on caserito.tiendas_osm;
create policy tiendas_osm_admin on caserito.tiendas_osm for all to authenticated using (caserito.es_admin()) with check (caserito.es_admin());
grant select on caserito.tiendas_osm to anon, authenticated;
grant insert, update, delete on caserito.tiendas_osm to authenticated;

-- Interruptor: mostrar o no las tiendas grises en el mapa de la app (parte apagado)
insert into caserito.ajustes (clave, valor) values ('tiendas_osm', 'no') on conflict (clave) do nothing;
create or replace function caserito.fijar_tiendas_osm(p_mostrar boolean)
returns boolean language plpgsql security definer set search_path = caserito, public as $$
begin
  if not caserito.es_admin() then raise exception 'Solo el admin puede cambiar esto'; end if;
  insert into caserito.ajustes (clave, valor, actualizado_at) values ('tiendas_osm', case when p_mostrar then 'si' else 'no' end, now())
  on conflict (clave) do update set valor = excluded.valor, actualizado_at = now();
  return p_mostrar;
end $$;
revoke all on function caserito.fijar_tiendas_osm(boolean) from public, anon;
grant execute on function caserito.fijar_tiendas_osm(boolean) to authenticated;

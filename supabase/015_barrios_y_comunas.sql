-- =========================================================
-- CASERITO · 015 · Barrios con límites y comuna
-- Cada barrio es un polígono (sus calles límite) con su comuna.
-- Cada local queda asignado solo a su barrio según su ubicación.
-- Barrios: Barrio Italia (lanzado), Franklin, Matta Sur y El Golf.
-- Los límites son aproximados por sus calles; se pueden ajustar
-- después con un update de la columna "limite".
-- Pegar completo en SQL Editor → Run (una vez).
-- =========================================================

create table if not exists caserito.barrios (
  id        text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  nombre    text not null,
  comuna    text not null,
  limites   text,                                 -- las calles límite, en palabras
  limite    geography(polygon, 4326) not null,
  activo    boolean not null default true,        -- se muestra en la app
  lanzado   boolean not null default false,       -- ya tiene locales funcionando
  orden     int not null default 0,
  creado_at timestamptz not null default now()
);
create index if not exists barrios_limite_idx on caserito.barrios using gist (limite);

alter table caserito.barrios enable row level security;
drop policy if exists barrios_ver on caserito.barrios;
create policy barrios_ver on caserito.barrios for select using (true);
drop policy if exists barrios_admin on caserito.barrios;
create policy barrios_admin on caserito.barrios for all to authenticated using (caserito.es_admin()) with check (caserito.es_admin());
grant select on caserito.barrios to anon, authenticated;
grant insert, update, delete on caserito.barrios to authenticated;

-- Polígonos: (longitud latitud), en el sentido de las calles límite
insert into caserito.barrios (id, nombre, comuna, limites, limite, lanzado, orden) values
  ('barrio-italia', 'Barrio Italia', 'Providencia y Ñuñoa',
   'Av. Francisco Bilbao (norte), Av. Salvador (oriente), Av. Irarrázaval (sur), Av. Seminario / General Bustamante (poniente)',
   'SRID=4326;POLYGON((-70.6305 -33.4392, -70.6120 -33.4392, -70.6120 -33.4548, -70.6305 -33.4548, -70.6305 -33.4392))', true, 1),
  ('franklin', 'Barrio Franklin', 'Santiago',
   'Franklin (norte), San Isidro (oriente), Placer / Biobío (sur), San Diego (poniente); incluye los persas',
   'SRID=4326;POLYGON((-70.6525 -33.4720, -70.6390 -33.4720, -70.6390 -33.4840, -70.6525 -33.4840, -70.6525 -33.4720))', false, 2),
  ('matta-sur', 'Barrio Matta Sur', 'Santiago',
   'Copiapó / Coquimbo (norte), Santa Elena (oriente), Ñuble (sur), Zenteno / San Diego (poniente)',
   'SRID=4326;POLYGON((-70.6530 -33.4545, -70.6325 -33.4545, -70.6325 -33.4695, -70.6530 -33.4695, -70.6530 -33.4545))', false, 3),
  ('el-golf', 'Barrio El Golf', 'Las Condes',
   'Presidente Riesco / Vitacura (norte), Alcántara (oriente), Apoquindo (sur), Av. Tobalaba (poniente)',
   'SRID=4326;POLYGON((-70.6035 -33.4078, -70.5895 -33.4078, -70.5895 -33.4182, -70.6035 -33.4182, -70.6035 -33.4078))', false, 4)
on conflict (id) do nothing;

-- ---------- Cada local en su barrio ----------
alter table caserito.locales add column if not exists barrio_id text references caserito.barrios(id) on delete set null;
create index if not exists locales_barrio_idx on caserito.locales (barrio_id);

-- El barrio que contiene el punto; si queda justo afuera (hasta 150 m), el más cercano
create or replace function caserito.barrio_de(p geography)
returns text language sql stable security definer set search_path = caserito, extensions, public as $$
  select coalesce(
    (select b.id from caserito.barrios b where b.activo and st_covers(b.limite, p) order by b.orden limit 1),
    (select b.id from caserito.barrios b where b.activo and st_dwithin(b.limite, p, 150) order by st_distance(b.limite, p) limit 1));
$$;

create or replace function caserito.asignar_barrio() returns trigger
language plpgsql security definer set search_path = caserito, extensions, public as $$
begin
  if new.ubicacion is not null then
    new.barrio_id := caserito.barrio_de(new.ubicacion);
    if new.barrio_id is not null then
      new.barrio := (select nombre from caserito.barrios where id = new.barrio_id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists asignar_barrio on caserito.locales;
create trigger asignar_barrio before insert or update of ubicacion on caserito.locales
  for each row execute function caserito.asignar_barrio();

-- Los locales que ya existen
update caserito.locales l set barrio_id = caserito.barrio_de(l.ubicacion) where l.ubicacion is not null;
update caserito.locales l set barrio = b.nombre from caserito.barrios b where b.id = l.barrio_id;

-- ---------- Para la app: barrios con su límite (GeoJSON) y su centro ----------
create or replace function caserito.barrios_mapa()
returns table (id text, nombre text, comuna text, lanzado boolean, orden int, limite jsonb, lat double precision, lng double precision, locales bigint)
language sql stable security definer set search_path = caserito, extensions, public as $$
  select b.id, b.nombre, b.comuna, b.lanzado, b.orden,
         st_asgeojson(b.limite)::jsonb,
         st_y(st_centroid(b.limite::geometry)), st_x(st_centroid(b.limite::geometry)),
         (select count(*) from caserito.locales l where l.barrio_id = b.id and l.activo and l.aprobado)
    from caserito.barrios b where b.activo order by b.orden;
$$;
revoke all on function caserito.barrios_mapa(), caserito.barrio_de(geography) from public;
grant execute on function caserito.barrios_mapa() to anon, authenticated;

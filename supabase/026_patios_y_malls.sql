-- =========================================================
-- DROPER · 026 · Patios y malls (lugares con plano propio)
-- Un "lugar" es un patio de comida, mercado, galería o mall dentro de un barrio.
-- Tiene uno o varios pisos, cada piso con su plano (imagen).
-- Cada local puede estar ubicado en un piso, en un punto del plano (x, y de 0 a 1).
-- Pegar completo en SQL Editor → Run (una vez).
-- =========================================================

create table if not exists caserito.lugares (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(nombre) between 2 and 60),
  tipo       text not null default 'patio' check (tipo in ('patio', 'mall')),
  barrio_id  text references caserito.barrios(id) on delete set null,
  lat        double precision not null,
  lng        double precision not null,
  radio_m    int not null default 60 check (radio_m between 15 and 400), -- "estás adentro" si estás a menos de esto
  activo     boolean not null default true,
  creado_at  timestamptz not null default now()
);

create table if not exists caserito.pisos (
  id         uuid primary key default gen_random_uuid(),
  lugar_id   uuid not null references caserito.lugares(id) on delete cascade,
  nivel      int not null default 1,            -- -1, 1, 2, 3…
  nombre     text not null default 'Piso 1',
  plano_url  text,                               -- imagen del plano (bucket caserito-planos)
  proporcion double precision not null default 1.4, -- ancho / alto del plano
  unique (lugar_id, nivel)
);

alter table caserito.locales add column if not exists piso_id uuid references caserito.pisos(id) on delete set null;
alter table caserito.locales add column if not exists plano_x double precision check (plano_x between 0 and 1);
alter table caserito.locales add column if not exists plano_y double precision check (plano_y between 0 and 1);
create index if not exists locales_piso_idx on caserito.locales (piso_id);

alter table caserito.lugares enable row level security;
alter table caserito.pisos enable row level security;
drop policy if exists lugares_ver on caserito.lugares;
create policy lugares_ver on caserito.lugares for select using (true);
drop policy if exists lugares_admin on caserito.lugares;
create policy lugares_admin on caserito.lugares for all to authenticated using (caserito.es_admin()) with check (caserito.es_admin());
drop policy if exists pisos_ver on caserito.pisos;
create policy pisos_ver on caserito.pisos for select using (true);
drop policy if exists pisos_admin on caserito.pisos;
create policy pisos_admin on caserito.pisos for all to authenticated using (caserito.es_admin()) with check (caserito.es_admin());
grant select on caserito.lugares, caserito.pisos to anon, authenticated;
grant insert, update, delete on caserito.lugares, caserito.pisos to authenticated;

-- Planos: bucket público; solo el admin sube
insert into storage.buckets (id, name, public)
values ('caserito-planos', 'caserito-planos', true)
on conflict (id) do update set public = true;
drop policy if exists planos_admin_subir on storage.objects;
create policy planos_admin_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'caserito-planos' and caserito.es_admin());
drop policy if exists planos_admin_cambiar on storage.objects;
create policy planos_admin_cambiar on storage.objects for update to authenticated
  using (bucket_id = 'caserito-planos' and caserito.es_admin());
drop policy if exists planos_admin_borrar on storage.objects;
create policy planos_admin_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'caserito-planos' and caserito.es_admin());

-- Admin: ubica un local en un punto del plano (o lo saca, con p_piso = null)
create or replace function caserito.ubicar_en_plano(p_local uuid, p_piso uuid, p_x double precision, p_y double precision)
returns void language plpgsql security definer set search_path = caserito, public as $$
begin
  if not caserito.es_admin() then raise exception 'Solo el admin ubica locales en los planos'; end if;
  update caserito.locales
     set piso_id = p_piso,
         plano_x = case when p_piso is null then null else least(greatest(p_x, 0), 1) end,
         plano_y = case when p_piso is null then null else least(greatest(p_y, 0), 1) end
   where id = p_local;
end $$;
grant execute on function caserito.ubicar_en_plano(uuid, uuid, double precision, double precision) to authenticated;

-- Para la app: lugares activos con sus pisos y cuántos locales tienen
create or replace function caserito.lugares_mapa()
returns table (id uuid, nombre text, tipo text, barrio_id text, lat double precision, lng double precision, radio_m int, locales bigint, pisos jsonb)
language sql stable security definer set search_path = caserito, public as $$
  select g.id, g.nombre, g.tipo, g.barrio_id, g.lat, g.lng, g.radio_m,
    (select count(*) from caserito.locales l join caserito.pisos p on p.id = l.piso_id where p.lugar_id = g.id and l.activo),
    coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nivel', p.nivel, 'nombre', p.nombre, 'plano_url', p.plano_url, 'proporcion', p.proporcion) order by p.nivel)
              from caserito.pisos p where p.lugar_id = g.id), '[]'::jsonb)
  from caserito.lugares g
  where g.activo;
$$;
grant execute on function caserito.lugares_mapa() to anon, authenticated;

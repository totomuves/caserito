-- =========================================================
-- CASERITO · 004 · Varias categorías por local + categorías nuevas
-- Correr DESPUÉS del 003. Pegar completo en SQL Editor → Run (una vez).
-- =========================================================
set search_path = caserito, public, extensions;

-- Lista oficial de categorías (máximo 3 por local)
create function caserito.categorias_validas()
returns text[] language sql immutable as $$
  select array[
    -- Comer y tomar
    'comer','tomar','cafe','dulce','almacen',
    -- Tiendas
    'diseno','deco','antiguedades','ropa','accesorios','libros','musica','arte','plantas',
    -- Servicios
    'belleza','bienestar','mascotas','otros'
  ]::text[];
$$;

alter table caserito.locales drop constraint if exists locales_categoria_check;
alter table caserito.locales add column categorias text[] not null default '{}';
update caserito.locales set categorias = array[categoria] where cardinality(categorias) = 0;
alter table caserito.locales add constraint locales_categorias_check
  check (cardinality(categorias) between 1 and 3 and categorias <@ caserito.categorias_validas());

-- "categoria" queda como la principal (la primera elegida), para no romper lo anterior
create function caserito.sincronizar_categoria() returns trigger
language plpgsql set search_path = caserito, public as $$
begin
  if cardinality(new.categorias) = 0 and new.categoria is not null then
    new.categorias := array[new.categoria];
  end if;
  new.categoria := new.categorias[1];
  return new;
end $$;
create trigger locales_sincronizar_categoria before insert or update on caserito.locales
for each row execute function caserito.sincronizar_categoria();

-- drops_cerca ahora también entrega todas las categorías del local
drop function caserito.drops_cerca(double precision, double precision, int);
create function caserito.drops_cerca(lat double precision, lng double precision, radio_m int default 1500)
returns table (
  drop_id uuid, local_id uuid, local_nombre text, categoria text, tipo text, titulo text,
  frase text, precio int, termina_at timestamptz, cuadras int, quedan bigint,
  nivel_actual text, dentro_del_radio boolean, categorias text[]
)
language sql stable security definer set search_path = caserito, public, extensions as $$
  select d.id, l.id, l.nombre, l.categoria, d.tipo, d.titulo,
         case when d.frase_aprobada then d.frase end,
         d.precio, d.termina_at,
         greatest(1, round(st_distance(l.ubicacion, st_makepoint(lng, lat)::geography) / 100.0))::int,
         e.quedan, e.nivel_actual,
         st_dwithin(l.ubicacion, st_makepoint(lng, lat)::geography, l.radio_m),
         l.categorias
  from caserito.drops d
  join caserito.locales l on l.id = d.local_id and l.activo and l.aprobado
  join caserito.drops_estado e on e.drop_id = d.id
  where now() between d.inicia_at and d.termina_at
    and e.quedan > 0
    and st_dwithin(l.ubicacion, st_makepoint(lng, lat)::geography, radio_m)
  order by 10;
$$;
revoke execute on function caserito.drops_cerca(double precision, double precision, int) from public;
grant execute on function caserito.drops_cerca(double precision, double precision, int) to anon, authenticated;

-- Ajuste: desde el SQL Editor (sin usuario de la app) también se puede aprobar
create or replace function caserito.proteger_aprobado() returns trigger
language plpgsql security definer set search_path = caserito, public as $$
begin
  if new.aprobado is distinct from old.aprobado and auth.uid() is not null and not caserito.es_admin() then
    raise exception 'Solo el admin puede aprobar locales';
  end if;
  return new;
end $$;

create or replace function caserito.proteger_aprobado_insert() returns trigger
language plpgsql security definer set search_path = caserito, public as $$
begin
  if auth.uid() is not null and not caserito.es_admin() then new.aprobado := false; end if;
  return new;
end $$;

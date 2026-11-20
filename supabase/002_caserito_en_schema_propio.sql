-- =========================================================
-- CASERITO · Base de datos en su propio espacio (schema "caserito")
-- Pensado para correr dentro de un proyecto Supabase que ya tiene
-- otra app (dogdate): no toca ninguna tabla existente.
-- Pegar completo en SQL Editor → Run. Correr UNA sola vez.
-- =========================================================

create extension if not exists postgis with schema extensions;
create schema if not exists caserito;
set search_path = caserito, public, extensions;

-- ---------- PERFILES ----------
-- No usa trigger en auth.users (para no crear perfiles a usuarios de dogdate):
-- la app llama a caserito.mi_perfil() al iniciar sesión.
create table caserito.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text,
  rol         text not null default 'cliente' check (rol in ('cliente','local')),
  creado_at   timestamptz not null default now()
);

-- ---------- LOCALES ----------
create table caserito.locales (
  id           uuid primary key default gen_random_uuid(),
  dueno_id     uuid not null references caserito.perfiles(id) on delete cascade,
  nombre       text not null,
  categoria    text not null check (categoria in ('comer','cafe','musica','ropa','diseno','otros')),
  cocina_pais  text,                     -- 'Venezolana', 'Mexicana'... para los modismos
  producto_estrella text,               -- dibujo de la lámina del álbum
  logo_url     text,
  direccion    text,
  barrio       text not null default 'Barrio Italia',
  ubicacion    geography(point, 4326) not null,
  radio_m      int  not null default 150 check (radio_m between 50 and 500),
  activo       boolean not null default true,
  creado_at    timestamptz not null default now()
);
create index locales_ubicacion_idx on caserito.locales using gist (ubicacion);

-- ---------- DROPS ----------
create table caserito.drops (
  id             uuid primary key default gen_random_uuid(),
  local_id       uuid not null references caserito.locales(id) on delete cascade,
  tipo           text not null default 'normal'
                 check (tipo in ('normal','grupal','sorpresa','recien_llegado')),
  titulo         text not null,
  descripcion    text,
  foto_url       text,
  precio         int,                    -- CLP
  precio_normal  int,
  cupo           int  not null check (cupo > 0),
  frase          text,                   -- frase con modismos que ve el caserito
  frase_aprobada boolean not null default false,
  inicia_at      timestamptz not null default now(),
  termina_at     timestamptz not null,
  creado_at      timestamptz not null default now(),
  check (termina_at > inicia_at)
);
create index drops_vigentes_idx on caserito.drops (termina_at, inicia_at);

create table caserito.drop_niveles (
  drop_id   uuid not null references caserito.drops(id) on delete cascade,
  umbral    int  not null check (umbral > 0),
  beneficio text not null,
  primary key (drop_id, umbral)
);

-- ---------- PARTICIPACIÓN Y CANJE ----------
create table caserito.participaciones (
  id          uuid primary key default gen_random_uuid(),
  drop_id     uuid not null references caserito.drops(id) on delete cascade,
  usuario_id  uuid not null references caserito.perfiles(id) on delete cascade,
  codigo      text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  anotado_at  timestamptz not null default now(),
  canjeado_at timestamptz,
  unique (drop_id, usuario_id)
);
create index participaciones_drop_idx on caserito.participaciones (drop_id);

-- ---------- ÁLBUM ----------
create table caserito.laminas (
  usuario_id  uuid not null references caserito.perfiles(id) on delete cascade,
  local_id    uuid not null references caserito.locales(id) on delete cascade,
  ganada_at   timestamptz not null default now(),
  primary key (usuario_id, local_id)
);

-- ---------- GUSTOS ----------
create table caserito.gustos (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references caserito.perfiles(id) on delete cascade,
  etiqueta    text not null,
  categoria   text,
  hora_desde  time,
  hora_hasta  time,
  origen      text not null default 'aprendido' check (origen in ('aprendido','manual')),
  activo      boolean not null default true,
  creado_at   timestamptz not null default now(),
  unique (usuario_id, etiqueta)
);

-- =========================================================
-- VISTA: estado en vivo de cada drop
-- =========================================================
create view caserito.drops_estado with (security_invoker = true) as
select
  d.id as drop_id,
  count(p.id)                                as anotados,
  count(p.canjeado_at)                       as canjeados,
  greatest(d.cupo - count(p.canjeado_at), 0) as quedan,
  (select n.beneficio from caserito.drop_niveles n
     where n.drop_id = d.id and n.umbral <= count(p.canjeado_at)
     order by n.umbral desc limit 1)         as nivel_actual,
  (select n.umbral from caserito.drop_niveles n
     where n.drop_id = d.id and n.umbral > count(p.canjeado_at)
     order by n.umbral asc limit 1)          as siguiente_umbral
from caserito.drops d
left join caserito.participaciones p on p.drop_id = d.id
group by d.id;

-- =========================================================
-- FUNCIONES
-- =========================================================

-- Crea (si no existe) y devuelve el perfil del usuario conectado
create function caserito.mi_perfil()
returns caserito.perfiles
language plpgsql security definer set search_path = caserito, public as $$
declare v caserito.perfiles;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  insert into caserito.perfiles (id) values (auth.uid()) on conflict (id) do nothing;
  select * into v from caserito.perfiles where id = auth.uid();
  return v;
end $$;

-- Drops vigentes cerca (con distancia en cuadras, ~100 m por cuadra)
create function caserito.drops_cerca(lat double precision, lng double precision, radio_m int default 1500)
returns table (
  drop_id uuid, local_id uuid, local_nombre text, categoria text, tipo text, titulo text,
  frase text, precio int, termina_at timestamptz, cuadras int, quedan bigint,
  nivel_actual text, dentro_del_radio boolean
)
language sql stable security definer set search_path = caserito, public, extensions as $$
  select d.id, l.id, l.nombre, l.categoria, d.tipo, d.titulo,
         case when d.frase_aprobada then d.frase end,
         d.precio, d.termina_at,
         greatest(1, round(st_distance(l.ubicacion, st_makepoint(lng, lat)::geography) / 100.0))::int,
         e.quedan, e.nivel_actual,
         st_dwithin(l.ubicacion, st_makepoint(lng, lat)::geography, l.radio_m)
  from caserito.drops d
  join caserito.locales l on l.id = d.local_id and l.activo
  join caserito.drops_estado e on e.drop_id = d.id
  where now() between d.inicia_at and d.termina_at
    and e.quedan > 0
    and st_dwithin(l.ubicacion, st_makepoint(lng, lat)::geography, radio_m)
  order by 10;
$$;

-- Estado de un drop (para el contador en vivo)
create function caserito.estado_drop(p_drop uuid)
returns table (anotados bigint, canjeados bigint, quedan bigint, nivel_actual text, siguiente_umbral int)
language sql stable security definer set search_path = caserito, public as $$
  select anotados, canjeados, quedan, nivel_actual, siguiente_umbral
  from caserito.drops_estado where drop_id = p_drop;
$$;

-- El cliente se suma a un drop (anotarse no exige estar en el local)
create function caserito.sumarme(p_drop uuid)
returns text
language plpgsql security definer set search_path = caserito, public as $$
declare v_codigo text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  insert into caserito.perfiles (id) values (auth.uid()) on conflict (id) do nothing;
  if not exists (select 1 from caserito.drops where id = p_drop and now() between inicia_at and termina_at) then
    raise exception 'El drop no está vigente';
  end if;
  insert into caserito.participaciones (drop_id, usuario_id) values (p_drop, auth.uid())
  on conflict (drop_id, usuario_id) do update set drop_id = excluded.drop_id
  returning codigo into v_codigo;
  return v_codigo;
end $$;

-- El local escanea el QR y canjea. Da la lámina del álbum en el primer canje.
create function caserito.canjear(p_codigo text)
returns table (titulo text, beneficio text, canjeados bigint, lamina_nueva boolean)
language plpgsql security definer set search_path = caserito, public as $$
declare v_part caserito.participaciones%rowtype; v_drop caserito.drops%rowtype; v_nueva boolean;
begin
  select * into v_part from caserito.participaciones where codigo = upper(replace(p_codigo, ' ', '')) for update;
  if not found then raise exception 'Código no válido'; end if;

  select * into v_drop from caserito.drops where id = v_part.drop_id;
  if not exists (select 1 from caserito.locales where id = v_drop.local_id and dueno_id = auth.uid()) then
    raise exception 'Este código es de otro local';
  end if;
  if v_part.canjeado_at is not null then raise exception 'Este código ya fue canjeado'; end if;
  if now() > v_drop.termina_at then raise exception 'El drop ya terminó'; end if;
  if (select quedan from caserito.drops_estado where drop_id = v_drop.id) <= 0 then
    raise exception 'Se acabó el cupo';
  end if;

  update caserito.participaciones set canjeado_at = now() where id = v_part.id;

  insert into caserito.laminas (usuario_id, local_id) values (v_part.usuario_id, v_drop.local_id)
  on conflict do nothing;
  get diagnostics v_nueva = row_count;

  return query
    select v_drop.titulo, e.nivel_actual, e.canjeados, v_nueva
    from caserito.drops_estado e where e.drop_id = v_drop.id;
end $$;

-- =========================================================
-- SEGURIDAD (RLS)
-- =========================================================
alter table caserito.perfiles        enable row level security;
alter table caserito.locales         enable row level security;
alter table caserito.drops           enable row level security;
alter table caserito.drop_niveles    enable row level security;
alter table caserito.participaciones enable row level security;
alter table caserito.laminas         enable row level security;
alter table caserito.gustos          enable row level security;

create policy perfil_propio_ver    on caserito.perfiles for select using (id = auth.uid());
create policy perfil_propio_editar on caserito.perfiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy locales_ver    on caserito.locales for select using (true);
create policy locales_crear  on caserito.locales for insert with check (dueno_id = auth.uid());
create policy locales_editar on caserito.locales for update using (dueno_id = auth.uid());

create policy drops_ver on caserito.drops for select using (true);
create policy drops_gestionar on caserito.drops for all
  using (exists (select 1 from caserito.locales l where l.id = local_id and l.dueno_id = auth.uid()))
  with check (exists (select 1 from caserito.locales l where l.id = local_id and l.dueno_id = auth.uid()));

create policy niveles_ver on caserito.drop_niveles for select using (true);
create policy niveles_gestionar on caserito.drop_niveles for all
  using (exists (select 1 from caserito.drops d join caserito.locales l on l.id = d.local_id
                 where d.id = drop_id and l.dueno_id = auth.uid()))
  with check (exists (select 1 from caserito.drops d join caserito.locales l on l.id = d.local_id
                 where d.id = drop_id and l.dueno_id = auth.uid()));

create policy part_cliente_ver on caserito.participaciones for select using (usuario_id = auth.uid());
create policy part_local_ver on caserito.participaciones for select
  using (exists (select 1 from caserito.drops d join caserito.locales l on l.id = d.local_id
                 where d.id = drop_id and l.dueno_id = auth.uid()));

create policy laminas_propias on caserito.laminas for select using (usuario_id = auth.uid());

create policy gustos_propios on caserito.gustos for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- =========================================================
-- PERMISOS DEL SCHEMA (RLS sigue mandando sobre las filas)
-- =========================================================
grant usage on schema caserito to anon, authenticated;
grant select on all tables in schema caserito to anon, authenticated;
grant insert, update, delete on caserito.locales, caserito.drops, caserito.drop_niveles,
  caserito.gustos to authenticated;
grant update on caserito.perfiles to authenticated;
revoke all on caserito.drops_estado from anon, authenticated;
revoke execute on all functions in schema caserito from public;
grant execute on function caserito.drops_cerca(double precision, double precision, int) to anon, authenticated;
grant execute on function caserito.estado_drop(uuid) to anon, authenticated;
grant execute on function caserito.mi_perfil()        to authenticated;
grant execute on function caserito.sumarme(uuid)      to authenticated;
grant execute on function caserito.canjear(text)      to authenticated;

-- Tiempo real: contador "quedan 7" y barra del drop grupal
alter publication supabase_realtime add table caserito.participaciones;

-- LISTO. Último paso fuera del SQL:
-- Settings → API (Data API) → "Exposed schemas" → agregar: caserito → Save.

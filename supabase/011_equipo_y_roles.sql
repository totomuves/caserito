-- =========================================================
-- CASERITO · 011 · Equipo del local con roles y permisos
-- El dueño crea roles (ej. "Administrador", "Cajero", "Barista")
-- y marca qué puede hacer cada uno:
--   drops       → crear, editar, duplicar y borrar drops
--   escanear    → escanear el QR de los caseritos (canjear)
--   resultados  → ver resultados y quiénes se anotaron
--   resenas     → ver y responder reseñas
--   local       → editar nombre, logo, categorías y ubicación
-- El equipo y los roles solo los maneja el dueño.
-- Se invita con un link: sirve una vez y dura 7 días.
-- Pegar completo en SQL Editor → Run (una vez).
-- =========================================================

create or replace function caserito.permisos_validos()
returns text[] language sql immutable as $$ select array['drops','escanear','resultados','resenas','local'] $$;

create table if not exists caserito.roles_local (
  id        uuid primary key default gen_random_uuid(),
  local_id  uuid not null references caserito.locales(id) on delete cascade,
  nombre    text not null check (char_length(btrim(nombre)) between 1 and 30),
  permisos  text[] not null check (cardinality(permisos) >= 1 and permisos <@ caserito.permisos_validos()),
  creado_at timestamptz not null default now(),
  unique (local_id, nombre)
);

create table if not exists caserito.equipo (
  local_id   uuid not null references caserito.locales(id) on delete cascade,
  usuario_id uuid not null references caserito.perfiles(id) on delete cascade,
  rol_id     uuid not null references caserito.roles_local(id) on delete restrict,
  creado_at  timestamptz not null default now(),
  primary key (local_id, usuario_id)
);
create index if not exists equipo_usuario_idx on caserito.equipo (usuario_id);

create table if not exists caserito.equipo_invitaciones (
  codigo     text primary key default upper(substr(md5(gen_random_uuid()::text), 1, 10)),
  local_id   uuid not null references caserito.locales(id) on delete cascade,
  rol_id     uuid not null references caserito.roles_local(id) on delete cascade,
  creada_por uuid references auth.users(id) on delete set null,
  creada_at  timestamptz not null default now(),
  expira_at  timestamptz not null default now() + interval '7 days',
  usada_por  uuid references auth.users(id) on delete set null,
  usada_at   timestamptz
);
alter table caserito.roles_local enable row level security;
alter table caserito.equipo enable row level security;
alter table caserito.equipo_invitaciones enable row level security;
-- (sin políticas: todo pasa por las funciones de abajo)

-- ---------- ¿Qué puedo hacer en este local? ----------
create or replace function caserito.es_dueno(p_local uuid)
returns boolean language sql stable security definer set search_path = caserito, public as $$
  select auth.uid() is not null and exists (select 1 from caserito.locales where id = p_local and dueno_id = auth.uid());
$$;

create or replace function caserito.permisos_en_local(p_local uuid)
returns text[] language sql stable security definer set search_path = caserito, public as $$
  select case
    when auth.uid() is null then '{}'::text[]
    when caserito.es_dueno(p_local) then caserito.permisos_validos() || array['equipo']
    else coalesce((select r.permisos from caserito.equipo e join caserito.roles_local r on r.id = e.rol_id
                    where e.local_id = p_local and e.usuario_id = auth.uid()), '{}'::text[])
  end;
$$;

create or replace function caserito.tiene_permiso(p_local uuid, p_permiso text)
returns boolean language sql stable security definer set search_path = caserito, public as $$
  select p_permiso = any (caserito.permisos_en_local(p_local));
$$;

-- Mis locales (como dueño o como parte de un equipo)
create or replace function caserito.mis_locales()
returns table (local_id uuid, rol text, permisos text[])
language sql stable security definer set search_path = caserito, public as $$
  select l.id, 'Dueño'::text, caserito.permisos_validos() || array['equipo']
    from caserito.locales l where l.dueno_id = auth.uid()
  union all
  select e.local_id, r.nombre, r.permisos
    from caserito.equipo e join caserito.roles_local r on r.id = e.rol_id
   where e.usuario_id = auth.uid();
$$;

-- ---------- Permisos en las tablas ----------
drop policy if exists drops_gestionar on caserito.drops;
create policy drops_gestionar on caserito.drops for all
  using (caserito.tiene_permiso(local_id, 'drops')) with check (caserito.tiene_permiso(local_id, 'drops'));

drop policy if exists niveles_gestionar on caserito.drop_niveles;
create policy niveles_gestionar on caserito.drop_niveles for all
  using (exists (select 1 from caserito.drops d where d.id = drop_id and caserito.tiene_permiso(d.local_id, 'drops')))
  with check (exists (select 1 from caserito.drops d where d.id = drop_id and caserito.tiene_permiso(d.local_id, 'drops')));

drop policy if exists part_local_ver on caserito.participaciones;
create policy part_local_ver on caserito.participaciones for select
  using (exists (select 1 from caserito.drops d where d.id = drop_id
                  and (caserito.tiene_permiso(d.local_id, 'drops') or caserito.tiene_permiso(d.local_id, 'resultados'))));

drop policy if exists resenas_ver on caserito.resenas;
create policy resenas_ver on caserito.resenas for select
  using (not oculta or usuario_id = auth.uid() or caserito.es_admin()
         or caserito.tiene_permiso(local_id, 'resenas') or caserito.tiene_permiso(local_id, 'resultados'));

drop policy if exists locales_editar on caserito.locales;
create policy locales_editar on caserito.locales for update
  using (dueno_id = auth.uid() or caserito.tiene_permiso(id, 'local'))
  with check (dueno_id = auth.uid() or caserito.tiene_permiso(id, 'local'));

-- Nadie del equipo puede quedarse con el local: el dueño no se cambia (salvo el admin)
create or replace function caserito.proteger_dueno() returns trigger
language plpgsql security definer set search_path = caserito, public as $$
begin
  if new.dueno_id is distinct from old.dueno_id and auth.uid() is not null and not caserito.es_admin() then
    raise exception 'El dueño del local no se puede cambiar';
  end if;
  return new;
end $$;
drop trigger if exists proteger_dueno on caserito.locales;
create trigger proteger_dueno before update on caserito.locales
  for each row execute function caserito.proteger_dueno();

create or replace function caserito.responder_resena(p_resena uuid, p_respuesta text)
returns void
language plpgsql security definer set search_path = caserito, public as $$
begin
  update caserito.resenas r set respuesta = nullif(trim(p_respuesta), '')
  where r.id = p_resena and caserito.tiene_permiso(r.local_id, 'resenas');
  if not found then raise exception 'No puedes responder esta reseña'; end if;
end $$;

create or replace function caserito.canjear(p_codigo text)
returns table (titulo text, beneficio text, canjeados bigint, lamina_nueva boolean)
language plpgsql security definer set search_path = caserito, public as $$
declare v_part caserito.participaciones%rowtype; v_drop caserito.drops%rowtype; v_nueva boolean;
begin
  select * into v_part from caserito.participaciones where codigo = upper(replace(p_codigo, ' ', '')) for update;
  if not found then raise exception 'Código no válido'; end if;

  select * into v_drop from caserito.drops where id = v_part.drop_id;
  if not caserito.tiene_permiso(v_drop.local_id, 'escanear') then
    if caserito.permisos_en_local(v_drop.local_id) <> '{}' then raise exception 'Tu rol no tiene permiso para escanear'; end if;
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

-- ---------- Roles (solo el dueño) ----------
create or replace function caserito.roles_del_local(p_local uuid)
returns table (id uuid, nombre text, permisos text[], miembros bigint)
language plpgsql security definer set search_path = caserito, public as $$
begin
  if not caserito.es_dueno(p_local) then raise exception 'Solo el dueño maneja los roles'; end if;
  -- Primera vez: dos roles de ejemplo que el dueño puede cambiar o borrar
  if not exists (select 1 from caserito.roles_local r where r.local_id = p_local) then
    insert into caserito.roles_local (local_id, nombre, permisos) values
      (p_local, 'Administrador', array['drops','escanear','resultados','resenas']),
      (p_local, 'Cajero', array['escanear']);
  end if;
  return query
    select r.id, r.nombre, r.permisos, (select count(*) from caserito.equipo e where e.rol_id = r.id)
      from caserito.roles_local r where r.local_id = p_local order by r.creado_at;
end $$;

create or replace function caserito.guardar_rol(p_local uuid, p_id uuid, p_nombre text, p_permisos text[])
returns uuid language plpgsql security definer set search_path = caserito, public as $$
declare v uuid; v_permisos text[];
begin
  if not caserito.es_dueno(p_local) then raise exception 'Solo el dueño maneja los roles'; end if;
  select coalesce(array_agg(distinct p), '{}') into v_permisos from unnest(p_permisos) p where p = any (caserito.permisos_validos());
  if cardinality(v_permisos) = 0 then raise exception 'Marca al menos un permiso'; end if;
  if p_id is null then
    insert into caserito.roles_local (local_id, nombre, permisos) values (p_local, btrim(p_nombre), v_permisos) returning id into v;
  else
    update caserito.roles_local set nombre = btrim(p_nombre), permisos = v_permisos
     where id = p_id and local_id = p_local returning id into v;
    if v is null then raise exception 'Ese rol no existe'; end if;
  end if;
  return v;
exception when unique_violation then raise exception 'Ya tienes un rol con ese nombre';
end $$;

create or replace function caserito.borrar_rol(p_local uuid, p_id uuid)
returns void language plpgsql security definer set search_path = caserito, public as $$
begin
  if not caserito.es_dueno(p_local) then raise exception 'Solo el dueño maneja los roles'; end if;
  if exists (select 1 from caserito.equipo where rol_id = p_id) then
    raise exception 'Hay gente con este rol: cámbiales el rol antes de borrarlo';
  end if;
  delete from caserito.roles_local where id = p_id and local_id = p_local;
end $$;

-- ---------- Invitaciones al equipo ----------
create or replace function caserito.invitar_al_equipo(p_local uuid, p_rol uuid)
returns text language plpgsql security definer set search_path = caserito, public as $$
declare v text;
begin
  if not caserito.es_dueno(p_local) then raise exception 'Solo el dueño puede invitar'; end if;
  if not exists (select 1 from caserito.roles_local where id = p_rol and local_id = p_local) then raise exception 'Ese rol no existe'; end if;
  insert into caserito.equipo_invitaciones (local_id, rol_id, creada_por) values (p_local, p_rol, auth.uid())
  returning codigo into v;
  return v;
end $$;

create or replace function caserito.ver_invitacion_equipo(p_codigo text)
returns table (local_nombre text, rol text, vigente boolean)
language sql stable security definer set search_path = caserito, public as $$
  select l.nombre, r.nombre, (i.usada_at is null and i.expira_at > now())
    from caserito.equipo_invitaciones i
    join caserito.locales l on l.id = i.local_id
    join caserito.roles_local r on r.id = i.rol_id
   where i.codigo = upper(btrim(p_codigo));
$$;

create or replace function caserito.usar_invitacion_equipo(p_codigo text)
returns uuid language plpgsql security definer set search_path = caserito, public as $$
declare v caserito.equipo_invitaciones;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into v from caserito.equipo_invitaciones where codigo = upper(btrim(p_codigo)) for update;
  if not found then raise exception 'Esa invitación no existe'; end if;
  if v.usada_at is not null then raise exception 'Esa invitación ya se usó. Pídele al dueño un link nuevo'; end if;
  if v.expira_at < now() then raise exception 'Esa invitación venció. Pídele al dueño un link nuevo'; end if;
  if caserito.es_dueno(v.local_id) then raise exception 'Ya eres el dueño de este local'; end if;
  insert into caserito.perfiles (id) values (auth.uid()) on conflict (id) do nothing;
  insert into caserito.equipo (local_id, usuario_id, rol_id) values (v.local_id, auth.uid(), v.rol_id)
  on conflict (local_id, usuario_id) do update set rol_id = excluded.rol_id;
  update caserito.equipo_invitaciones set usada_por = auth.uid(), usada_at = now() where codigo = v.codigo;
  return v.local_id;
end $$;

-- ---------- El dueño ve y maneja su equipo ----------
create or replace function caserito.equipo_del_local(p_local uuid)
returns table (usuario_id uuid, correo text, rol_id uuid, rol text, desde timestamptz)
language plpgsql stable security definer set search_path = caserito, public as $$
begin
  if not caserito.es_dueno(p_local) then raise exception 'Solo el dueño ve el equipo'; end if;
  return query
    select e.usuario_id, u.email::text, e.rol_id, r.nombre, e.creado_at
      from caserito.equipo e
      join caserito.roles_local r on r.id = e.rol_id
      left join auth.users u on u.id = e.usuario_id
     where e.local_id = p_local order by e.creado_at;
end $$;

create or replace function caserito.invitaciones_del_local(p_local uuid)
returns table (codigo text, rol text, expira_at timestamptz)
language plpgsql stable security definer set search_path = caserito, public as $$
begin
  if not caserito.es_dueno(p_local) then raise exception 'Solo el dueño ve las invitaciones'; end if;
  return query
    select i.codigo, r.nombre, i.expira_at
      from caserito.equipo_invitaciones i join caserito.roles_local r on r.id = i.rol_id
     where i.local_id = p_local and i.usada_at is null and i.expira_at > now()
     order by i.creada_at desc;
end $$;

create or replace function caserito.anular_invitacion_equipo(p_codigo text)
returns void language plpgsql security definer set search_path = caserito, public as $$
begin
  delete from caserito.equipo_invitaciones i
   where i.codigo = p_codigo and i.usada_at is null and caserito.es_dueno(i.local_id);
end $$;

create or replace function caserito.cambiar_rol_equipo(p_local uuid, p_usuario uuid, p_rol uuid)
returns void language plpgsql security definer set search_path = caserito, public as $$
begin
  if not caserito.es_dueno(p_local) then raise exception 'Solo el dueño cambia roles'; end if;
  if not exists (select 1 from caserito.roles_local where id = p_rol and local_id = p_local) then raise exception 'Ese rol no existe'; end if;
  update caserito.equipo set rol_id = p_rol where local_id = p_local and usuario_id = p_usuario;
end $$;

create or replace function caserito.quitar_del_equipo(p_local uuid, p_usuario uuid)
returns void language plpgsql security definer set search_path = caserito, public as $$
begin
  -- el dueño saca a cualquiera; cada uno puede salirse solo
  if not caserito.es_dueno(p_local) and p_usuario <> auth.uid() then
    raise exception 'Solo el dueño saca gente del equipo';
  end if;
  delete from caserito.equipo where local_id = p_local and usuario_id = p_usuario;
end $$;

-- ---------- Quién puede llamar a qué ----------
revoke all on function
  caserito.es_dueno(uuid), caserito.permisos_en_local(uuid), caserito.tiene_permiso(uuid, text), caserito.mis_locales(),
  caserito.roles_del_local(uuid), caserito.guardar_rol(uuid, uuid, text, text[]), caserito.borrar_rol(uuid, uuid),
  caserito.invitar_al_equipo(uuid, uuid), caserito.ver_invitacion_equipo(text), caserito.usar_invitacion_equipo(text),
  caserito.equipo_del_local(uuid), caserito.invitaciones_del_local(uuid), caserito.anular_invitacion_equipo(text),
  caserito.cambiar_rol_equipo(uuid, uuid, uuid), caserito.quitar_del_equipo(uuid, uuid)
from public, anon;
grant execute on function
  caserito.es_dueno(uuid), caserito.permisos_en_local(uuid), caserito.tiene_permiso(uuid, text), caserito.mis_locales(),
  caserito.roles_del_local(uuid), caserito.guardar_rol(uuid, uuid, text, text[]), caserito.borrar_rol(uuid, uuid),
  caserito.invitar_al_equipo(uuid, uuid), caserito.usar_invitacion_equipo(text),
  caserito.equipo_del_local(uuid), caserito.invitaciones_del_local(uuid), caserito.anular_invitacion_equipo(text),
  caserito.cambiar_rol_equipo(uuid, uuid, uuid), caserito.quitar_del_equipo(uuid, uuid)
to authenticated;
grant execute on function caserito.ver_invitacion_equipo(text) to anon, authenticated;
grant execute on function caserito.canjear(text), caserito.responder_resena(uuid, text) to authenticated;

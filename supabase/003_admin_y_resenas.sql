-- =========================================================
-- CASERITO · 003 · Admin general + reseñas verificadas
-- Correr DESPUÉS del 002. Pegar completo en SQL Editor → Run (una vez).
-- =========================================================
set search_path = caserito, public, extensions;

-- ---------- ADMIN ----------
create table caserito.admins (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  creado_at timestamptz not null default now()
);
alter table caserito.admins enable row level security;
-- (sin políticas: nadie la lee directo; se consulta con es_admin())

create function caserito.es_admin()
returns boolean
language sql stable security definer set search_path = caserito, public as $$
  select exists (select 1 from caserito.admins where user_id = auth.uid());
$$;

-- ---------- APROBACIÓN DE LOCALES ----------
-- Los locales nuevos quedan "en revisión" hasta que el admin los aprueba.
alter table caserito.locales add column aprobado boolean not null default false;

-- Solo locales aprobados y activos aparecen a los caseritos
create or replace function caserito.drops_cerca(lat double precision, lng double precision, radio_m int default 1500)
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
  join caserito.locales l on l.id = d.local_id and l.activo and l.aprobado
  join caserito.drops_estado e on e.drop_id = d.id
  where now() between d.inicia_at and d.termina_at
    and e.quedan > 0
    and st_dwithin(l.ubicacion, st_makepoint(lng, lat)::geography, radio_m)
  order by 10;
$$;

-- El admin puede editar cualquier local (aprobar, pausar) y cualquier drop (bajarlo)
create policy locales_admin on caserito.locales for update
  using (caserito.es_admin()) with check (caserito.es_admin());
create policy drops_admin on caserito.drops for update
  using (caserito.es_admin()) with check (caserito.es_admin());
create policy drops_admin_borrar on caserito.drops for delete
  using (caserito.es_admin());
create policy part_admin_ver on caserito.participaciones for select
  using (caserito.es_admin());

-- Un local no puede aprobarse a sí mismo
create function caserito.proteger_aprobado() returns trigger
language plpgsql security definer set search_path = caserito, public as $$
begin
  if new.aprobado is distinct from old.aprobado and not caserito.es_admin() then
    raise exception 'Solo el admin puede aprobar locales';
  end if;
  return new;
end $$;
create trigger locales_proteger_aprobado before update on caserito.locales
for each row execute function caserito.proteger_aprobado();

create function caserito.proteger_aprobado_insert() returns trigger
language plpgsql security definer set search_path = caserito, public as $$
begin
  if not caserito.es_admin() then new.aprobado := false; end if;
  return new;
end $$;
create trigger locales_proteger_aprobado_ins before insert on caserito.locales
for each row execute function caserito.proteger_aprobado_insert();

-- Números del barrio para el admin
create function caserito.admin_resumen()
returns json
language plpgsql stable security definer set search_path = caserito, public as $$
declare r json;
begin
  if not caserito.es_admin() then raise exception 'Solo para el admin'; end if;
  select json_build_object(
    'locales',            (select count(*) from caserito.locales),
    'locales_aprobados',  (select count(*) from caserito.locales where aprobado),
    'locales_pendientes', (select count(*) from caserito.locales where not aprobado),
    'caseritos',          (select count(*) from caserito.perfiles where rol = 'cliente'),
    'drops_activos',      (select count(*) from caserito.drops where now() between inicia_at and termina_at),
    'drops_semana',       (select count(*) from caserito.drops where creado_at > now() - interval '7 days'),
    'canjes_hoy',         (select count(*) from caserito.participaciones where canjeado_at::date = now()::date),
    'canjes_semana',      (select count(*) from caserito.participaciones where canjeado_at > now() - interval '7 days'),
    'ventas_semana',      (select coalesce(sum(d.precio), 0) from caserito.participaciones p
                             join caserito.drops d on d.id = p.drop_id
                            where p.canjeado_at > now() - interval '7 days'),
    'resenas',            (select count(*) from caserito.resenas)
  ) into r;
  return r;
end $$;

-- ---------- RESEÑAS VERIFICADAS ----------
-- Solo reseña quien canjeó en ese local (tiene su lámina). Una por persona y local.
create table caserito.resenas (
  id          uuid primary key default gen_random_uuid(),
  local_id    uuid not null references caserito.locales(id) on delete cascade,
  usuario_id  uuid not null references caserito.perfiles(id) on delete cascade,
  estrellas   int  not null check (estrellas between 1 and 5),
  texto       text check (char_length(texto) <= 280),
  respuesta   text check (char_length(respuesta) <= 280),
  oculta      boolean not null default false,
  creado_at   timestamptz not null default now(),
  unique (local_id, usuario_id)
);
create index resenas_local_idx on caserito.resenas (local_id, creado_at desc);
alter table caserito.resenas enable row level security;

create policy resenas_ver on caserito.resenas for select
  using (not oculta or usuario_id = auth.uid() or caserito.es_admin()
         or exists (select 1 from caserito.locales l where l.id = local_id and l.dueno_id = auth.uid()));
create policy resenas_admin on caserito.resenas for update
  using (caserito.es_admin()) with check (caserito.es_admin());

-- Promedio y cantidad por local (solo reseñas visibles)
create view caserito.calificaciones with (security_invoker = true) as
select local_id, round(avg(estrellas)::numeric, 1) as promedio, count(*) as cantidad
from caserito.resenas where not oculta
group by local_id;

-- Dejar o cambiar mi reseña
create function caserito.resenar(p_local uuid, p_estrellas int, p_texto text default null)
returns caserito.resenas
language plpgsql security definer set search_path = caserito, public as $$
declare r caserito.resenas;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if not exists (select 1 from caserito.laminas where usuario_id = auth.uid() and local_id = p_local) then
    raise exception 'Solo puedes reseñar locales donde canjeaste un drop';
  end if;
  insert into caserito.resenas (local_id, usuario_id, estrellas, texto)
  values (p_local, auth.uid(), p_estrellas, nullif(trim(p_texto), ''))
  on conflict (local_id, usuario_id) do update
    set estrellas = excluded.estrellas, texto = excluded.texto, creado_at = now()
  returning * into r;
  return r;
end $$;

-- El dueño responde una reseña de su local
create function caserito.responder_resena(p_resena uuid, p_respuesta text)
returns void
language plpgsql security definer set search_path = caserito, public as $$
begin
  update caserito.resenas r set respuesta = nullif(trim(p_respuesta), '')
  where r.id = p_resena
    and exists (select 1 from caserito.locales l where l.id = r.local_id and l.dueno_id = auth.uid());
  if not found then raise exception 'No puedes responder esta reseña'; end if;
end $$;

-- ---------- PERMISOS ----------
grant select on caserito.resenas, caserito.calificaciones to anon, authenticated;
grant update on caserito.resenas to authenticated;
grant delete on caserito.drops to authenticated;
revoke execute on all functions in schema caserito from public;
grant execute on function caserito.drops_cerca(double precision, double precision, int) to anon, authenticated;
grant execute on function caserito.estado_drop(uuid)  to anon, authenticated;
grant execute on function caserito.mi_perfil()        to authenticated;
grant execute on function caserito.sumarme(uuid)      to authenticated;
grant execute on function caserito.canjear(text)      to authenticated;
grant execute on function caserito.es_admin()         to anon, authenticated;
grant execute on function caserito.admin_resumen()    to authenticated;
grant execute on function caserito.resenar(uuid, int, text)          to authenticated;
grant execute on function caserito.responder_resena(uuid, text)      to authenticated;

-- =========================================================
-- HACERTE ADMIN (después de crear tu cuenta en el panel del local):
--   insert into caserito.admins (user_id)
--   select id from auth.users where email = 'TU_CORREO@gmail.com';
-- =========================================================

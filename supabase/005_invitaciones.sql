-- =========================================================
-- CASERITO · 005 · Links de invitación para locales
-- El admin crea un link; el local que se inscribe con él queda aprobado al tiro.
-- Correr DESPUÉS del 004. Pegar completo en SQL Editor → Run (una vez).
-- =========================================================
set search_path = caserito, public, extensions;

create table caserito.invitaciones (
  codigo       text primary key default upper(substr(md5(gen_random_uuid()::text), 1, 10)),
  nombre_local text,
  creada_por   uuid references auth.users(id) on delete set null,
  creada_at    timestamptz not null default now(),
  usada_por    uuid references auth.users(id) on delete set null,
  usada_at     timestamptz
);
alter table caserito.invitaciones enable row level security;
create policy invitaciones_admin on caserito.invitaciones for all
  using (caserito.es_admin()) with check (caserito.es_admin());
grant select, insert, delete on caserito.invitaciones to authenticated;

-- El disparador que protege la aprobación deja pasar cuando aprueba una invitación válida
create or replace function caserito.proteger_aprobado() returns trigger
language plpgsql security definer set search_path = caserito, public as $$
begin
  if new.aprobado is distinct from old.aprobado
     and auth.uid() is not null
     and not caserito.es_admin()
     and coalesce(current_setting('caserito.aprobando', true), '') <> 'si' then
    raise exception 'Solo el admin puede aprobar locales';
  end if;
  return new;
end $$;

-- El dueño usa el código (después de inscribir su local): su local queda aprobado
create function caserito.usar_invitacion(p_codigo text)
returns boolean
language plpgsql security definer set search_path = caserito, public as $$
declare v caserito.invitaciones;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into v from caserito.invitaciones where codigo = upper(trim(p_codigo)) for update;
  if not found then raise exception 'Esa invitación no existe'; end if;
  if v.usada_por is not null and v.usada_por <> auth.uid() then raise exception 'Esa invitación ya fue usada'; end if;
  if not exists (select 1 from caserito.locales where dueno_id = auth.uid()) then
    raise exception 'Primero inscribe tu local';
  end if;
  perform set_config('caserito.aprobando', 'si', true);
  update caserito.locales set aprobado = true where dueno_id = auth.uid() and not aprobado;
  perform set_config('caserito.aprobando', '', true);
  update caserito.invitaciones set usada_por = auth.uid(), usada_at = coalesce(usada_at, now()) where codigo = v.codigo;
  return true;
end $$;
revoke execute on function caserito.usar_invitacion(text) from public;
grant execute on function caserito.usar_invitacion(text) to authenticated;

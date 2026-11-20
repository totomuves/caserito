-- =========================================================
-- CASERITO · 009 · Cuentas de caseritos y comentarios de la beta
-- - Apodo del caserito (lo elige en "Tú").
-- - Comentarios: amigos y locales que prueban la app mandan
--   ideas o errores; solo el admin los lee.
-- Pegar completo en SQL Editor → Run (una vez).
-- =========================================================

create or replace function caserito.guardar_apodo(p_apodo text)
returns void language plpgsql security definer set search_path = caserito, public as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  insert into caserito.perfiles (id) values (auth.uid()) on conflict (id) do nothing;
  update caserito.perfiles set nombre = nullif(left(btrim(p_apodo), 30), '') where id = auth.uid();
end $$;
revoke all on function caserito.guardar_apodo(text) from public, anon;
grant execute on function caserito.guardar_apodo(text) to authenticated;

create table if not exists caserito.comentarios (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references caserito.perfiles(id) on delete cascade,
  origen     text not null default 'app' check (origen in ('app','panel')),
  texto      text not null check (char_length(btrim(texto)) between 1 and 1000),
  contacto   text check (contacto is null or char_length(contacto) <= 120),
  plataforma text check (plataforma is null or char_length(plataforma) <= 20),
  version    text check (version is null or char_length(version) <= 40),
  leido      boolean not null default false,
  creado_at  timestamptz not null default now()
);
create index if not exists comentarios_fecha_idx on caserito.comentarios (creado_at desc);
alter table caserito.comentarios enable row level security;

drop policy if exists comentarios_crear on caserito.comentarios;
create policy comentarios_crear on caserito.comentarios for insert to authenticated
  with check (usuario_id = auth.uid() and leido = false);
drop policy if exists comentarios_admin_ver on caserito.comentarios;
create policy comentarios_admin_ver on caserito.comentarios for select to authenticated using (caserito.es_admin());
drop policy if exists comentarios_admin_editar on caserito.comentarios;
create policy comentarios_admin_editar on caserito.comentarios for update to authenticated
  using (caserito.es_admin()) with check (caserito.es_admin());

grant select, insert, update on caserito.comentarios to authenticated;

-- El admin ve los apodos (para saber quién comentó)
drop policy if exists perfiles_admin_ver on caserito.perfiles;
create policy perfiles_admin_ver on caserito.perfiles for select to authenticated using (caserito.es_admin());

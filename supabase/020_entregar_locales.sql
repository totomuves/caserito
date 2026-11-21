-- 020 · El admin crea locales y después se los entrega a sus dueños con un link
create table if not exists caserito.entregas_local (
  codigo      text primary key,
  local_id    uuid not null references caserito.locales(id) on delete cascade,
  creado_por  uuid not null references caserito.perfiles(id) on delete cascade,
  creado_at   timestamptz not null default now(),
  expira_at   timestamptz not null default now() + interval '30 days',
  usado_por   uuid references caserito.perfiles(id) on delete set null,
  usado_at    timestamptz
);
alter table caserito.entregas_local enable row level security;
drop policy if exists entregas_admin on caserito.entregas_local;
create policy entregas_admin on caserito.entregas_local for select using (caserito.es_admin());
grant select on caserito.entregas_local to authenticated;

-- El cambio de dueño solo lo puede hacer el admin… o una entrega válida
create or replace function caserito.proteger_dueno() returns trigger
language plpgsql security definer set search_path = caserito, public as $$
begin
  if new.dueno_id is distinct from old.dueno_id and auth.uid() is not null and not caserito.es_admin()
     and coalesce(current_setting('caserito.entrega', true), '') <> 'si' then
    raise exception 'El dueño del local no se puede cambiar';
  end if;
  return new;
end $$;

-- Admin: crea (o renueva) el link de entrega de un local
create or replace function caserito.crear_entrega(p_local uuid)
returns text language plpgsql security definer set search_path = caserito, public as $$
declare v_codigo text;
begin
  if not caserito.es_admin() then raise exception 'Solo el admin puede entregar locales'; end if;
  update caserito.entregas_local set expira_at = now() where local_id = p_local and usado_at is null and expira_at > now();
  v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into caserito.entregas_local (codigo, local_id, creado_por) values (v_codigo, p_local, auth.uid());
  return v_codigo;
end $$;

-- Cualquiera con el link ve qué local le están entregando (para mostrarlo antes de entrar)
create or replace function caserito.ver_entrega(p_codigo text)
returns table (local_nombre text, barrio text, vigente boolean)
language sql stable security definer set search_path = caserito, public as $$
  select l.nombre, l.barrio, (e.usado_at is null and e.expira_at > now())
  from caserito.entregas_local e join caserito.locales l on l.id = e.local_id
  where e.codigo = upper(trim(p_codigo));
$$;

-- El dueño, ya con su cuenta, recibe el local: pasa a ser el dueño
create or replace function caserito.recibir_local(p_codigo text)
returns uuid language plpgsql security definer set search_path = caserito, public as $$
declare v caserito.entregas_local%rowtype;
begin
  if auth.uid() is null then raise exception 'Entra con tu cuenta para recibir el local'; end if;
  select * into v from caserito.entregas_local where codigo = upper(trim(p_codigo)) for update;
  if not found then raise exception 'Ese link de entrega no existe'; end if;
  if v.usado_at is not null then raise exception 'Este local ya fue entregado'; end if;
  if v.expira_at <= now() then raise exception 'El link venció. Pídele uno nuevo a Caserito'; end if;
  insert into caserito.perfiles (id) values (auth.uid()) on conflict do nothing;
  perform set_config('caserito.entrega', 'si', true);
  update caserito.locales set dueno_id = auth.uid() where id = v.local_id;
  update caserito.entregas_local set usado_por = auth.uid(), usado_at = now() where codigo = v.codigo;
  return v.local_id;
end $$;

-- Para la lista del admin: estado de entrega de cada local
create or replace function caserito.entregas_por_local()
returns table (local_id uuid, codigo text, expira_at timestamptz, usado_at timestamptz, dueno_es_admin boolean)
language sql stable security definer set search_path = caserito, public as $$
  select l.id, e.codigo, e.expira_at, e.usado_at,
         exists (select 1 from caserito.admins a where a.user_id = l.dueno_id)
  from caserito.locales l
  left join lateral (
    select * from caserito.entregas_local x where x.local_id = l.id order by x.creado_at desc limit 1
  ) e on true
  where caserito.es_admin();
$$;

revoke all on function caserito.crear_entrega(uuid) from public, anon;
revoke all on function caserito.recibir_local(text) from public, anon;
grant execute on function caserito.crear_entrega(uuid) to authenticated;
grant execute on function caserito.recibir_local(text) to authenticated;
grant execute on function caserito.ver_entrega(text) to anon, authenticated;
grant execute on function caserito.entregas_por_local() to authenticated;

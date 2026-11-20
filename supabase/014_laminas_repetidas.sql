-- =========================================================
-- CASERITO · 014 · Láminas repetidas
-- La primera vez que canjeas en un local ganas su lámina; cada canje
-- siguiente ahí es una "repetida". El local define qué da a cambio
-- (ej. 5 repetidas = 1 cortado gratis). El caserito pide el cambio en
-- su álbum, le sale un QR y el local lo escanea como cualquier canje.
-- Requiere el 011 (equipo y permisos). Pegar completo → Run (una vez).
-- =========================================================

alter table caserito.locales
  add column if not exists repetidas_necesarias int check (repetidas_necesarias between 2 and 20),
  add column if not exists repetidas_premio text check (repetidas_premio is null or char_length(btrim(repetidas_premio)) between 1 and 80);

create table if not exists caserito.cambios_repetidas (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique default 'R' || upper(substr(md5(gen_random_uuid()::text), 1, 7)),
  usuario_id  uuid not null default auth.uid() references caserito.perfiles(id) on delete cascade,
  local_id    uuid not null references caserito.locales(id) on delete cascade,
  cantidad    int not null check (cantidad > 0),
  premio      text not null,
  creado_at   timestamptz not null default now(),
  expira_at   timestamptz not null default now() + interval '7 days',
  canjeado_at timestamptz
);
create index if not exists cambios_repetidas_usuario_idx on caserito.cambios_repetidas (usuario_id, local_id);
alter table caserito.cambios_repetidas enable row level security;
drop policy if exists cambios_propios_ver on caserito.cambios_repetidas;
create policy cambios_propios_ver on caserito.cambios_repetidas for select using (usuario_id = auth.uid());
grant select on caserito.cambios_repetidas to authenticated;

-- Repetidas disponibles = canjes en el local − 1 (la primera es la lámina) − las ya usadas o reservadas
create or replace function caserito.repetidas_de(p_usuario uuid, p_local uuid)
returns int language sql stable security definer set search_path = caserito, public as $$
  select greatest(0,
    greatest(0, (select count(*)::int from caserito.participaciones p join caserito.drops d on d.id = p.drop_id
                  where p.usuario_id = p_usuario and d.local_id = p_local and p.canjeado_at is not null) - 1)
    - coalesce((select sum(c.cantidad)::int from caserito.cambios_repetidas c
                 where c.usuario_id = p_usuario and c.local_id = p_local
                   and (c.canjeado_at is not null or c.expira_at > now())), 0));
$$;

create or replace function caserito.mis_repetidas()
returns table (local_id uuid, nombre text, repetidas int, necesarias int, premio text, codigo text, expira_at timestamptz)
language sql stable security definer set search_path = caserito, public as $$
  select l.id, l.nombre, caserito.repetidas_de(auth.uid(), l.id), l.repetidas_necesarias, l.repetidas_premio, c.codigo, c.expira_at
    from caserito.laminas la
    join caserito.locales l on l.id = la.local_id
    left join lateral (
      select c.codigo, c.expira_at from caserito.cambios_repetidas c
       where c.usuario_id = auth.uid() and c.local_id = l.id and c.canjeado_at is null and c.expira_at > now()
       order by c.creado_at desc limit 1) c on true
   where la.usuario_id = auth.uid();
$$;

create or replace function caserito.pedir_cambio_repetidas(p_local uuid)
returns text language plpgsql security definer set search_path = caserito, public as $$
declare v_l caserito.locales; v_codigo text; v_tengo int;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into v_l from caserito.locales where id = p_local;
  if not found or v_l.repetidas_necesarias is null or v_l.repetidas_premio is null then
    raise exception 'Este local todavía no cambia repetidas';
  end if;
  -- si ya tiene un cambio pendiente, se devuelve el mismo código
  select codigo into v_codigo from caserito.cambios_repetidas
   where usuario_id = auth.uid() and local_id = p_local and canjeado_at is null and expira_at > now()
   order by creado_at desc limit 1;
  if v_codigo is not null then return v_codigo; end if;
  v_tengo := caserito.repetidas_de(auth.uid(), p_local);
  if v_tengo < v_l.repetidas_necesarias then
    if v_l.repetidas_necesarias - v_tengo = 1 then raise exception 'Te falta 1 repetida para el cambio'; end if;
    raise exception 'Te faltan % repetidas para el cambio', v_l.repetidas_necesarias - v_tengo;
  end if;
  insert into caserito.cambios_repetidas (usuario_id, local_id, cantidad, premio)
  values (auth.uid(), p_local, v_l.repetidas_necesarias, v_l.repetidas_premio)
  returning codigo into v_codigo;
  return v_codigo;
end $$;

create or replace function caserito.anular_cambio_repetidas(p_codigo text)
returns void language sql security definer set search_path = caserito, public as $$
  delete from caserito.cambios_repetidas where codigo = p_codigo and usuario_id = auth.uid() and canjeado_at is null;
$$;

-- Canjear: ahora también lee los códigos de cambio de repetidas (empiezan con R)
drop function if exists caserito.canjear(text);
create function caserito.canjear(p_codigo text)
returns table (titulo text, beneficio text, canjeados bigint, lamina_nueva boolean, tipo text)
language plpgsql security definer set search_path = caserito, public as $$
declare v_part caserito.participaciones%rowtype; v_drop caserito.drops%rowtype; v_nueva boolean;
        v_cambio caserito.cambios_repetidas%rowtype; v_codigo text := upper(replace(p_codigo, ' ', ''));
begin
  select * into v_cambio from caserito.cambios_repetidas where codigo = v_codigo for update;
  if found then
    if not caserito.tiene_permiso(v_cambio.local_id, 'escanear') then
      if caserito.permisos_en_local(v_cambio.local_id) <> '{}' then raise exception 'Tu rol no tiene permiso para escanear'; end if;
      raise exception 'Este código es de otro local';
    end if;
    if v_cambio.canjeado_at is not null then raise exception 'Este cambio de repetidas ya se usó'; end if;
    if v_cambio.expira_at < now() then raise exception 'Este cambio de repetidas venció. Que lo pida de nuevo en su álbum'; end if;
    update caserito.cambios_repetidas set canjeado_at = now() where id = v_cambio.id;
    return query select ('Cambio de ' || v_cambio.cantidad || ' repetidas')::text, v_cambio.premio, null::bigint, false, 'repetidas'::text;
    return;
  end if;

  select * into v_part from caserito.participaciones where codigo = v_codigo for update;
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
    select v_drop.titulo, e.nivel_actual, e.canjeados, v_nueva, 'drop'::text
    from caserito.drops_estado e where e.drop_id = v_drop.id;
end $$;

revoke all on function caserito.repetidas_de(uuid, uuid), caserito.mis_repetidas(), caserito.pedir_cambio_repetidas(uuid),
  caserito.anular_cambio_repetidas(text), caserito.canjear(text) from public, anon;
grant execute on function caserito.mis_repetidas(), caserito.pedir_cambio_repetidas(uuid),
  caserito.anular_cambio_repetidas(text), caserito.canjear(text) to authenticated;

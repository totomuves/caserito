-- =========================================================
-- CASERITO · 016 · Láminas por el arte del barrio
-- Cada barrio puede tener su "arte": una ilustración, póster o
-- serigrafía de un artista del barrio. Quien junta N láminas
-- distintas de ese barrio lo pide en su álbum, le sale un QR y
-- lo retira en el local que funciona como punto de canje.
-- Una vez por persona y por barrio.
-- Requiere 011, 014 y 015. Pegar completo → Run (una vez).
-- =========================================================

alter table caserito.barrios
  add column if not exists arte_nombre      text check (arte_nombre is null or char_length(btrim(arte_nombre)) between 1 and 80),
  add column if not exists arte_descripcion text check (arte_descripcion is null or char_length(arte_descripcion) <= 300),
  add column if not exists arte_laminas     int  check (arte_laminas between 2 and 50),
  add column if not exists arte_local_id    uuid references caserito.locales(id) on delete set null,
  add column if not exists arte_imagen_url  text;

create table if not exists caserito.cambios_arte (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique default 'A' || upper(substr(md5(gen_random_uuid()::text), 1, 7)),
  usuario_id  uuid not null default auth.uid() references caserito.perfiles(id) on delete cascade,
  barrio_id   text not null references caserito.barrios(id) on delete cascade,
  creado_at   timestamptz not null default now(),
  canjeado_at timestamptz,
  canjeado_en uuid references caserito.locales(id) on delete set null,
  unique (usuario_id, barrio_id)
);
alter table caserito.cambios_arte enable row level security;
drop policy if exists arte_propio_ver on caserito.cambios_arte;
create policy arte_propio_ver on caserito.cambios_arte for select using (usuario_id = auth.uid() or caserito.es_admin());
grant select on caserito.cambios_arte to authenticated;

-- Lo que el caserito ve en su álbum de ese barrio
create or replace function caserito.mi_arte(p_barrio text)
returns table (nombre text, descripcion text, imagen text, necesarias int, tengo int, punto text, codigo text, canjeado_at timestamptz)
language sql stable security definer set search_path = caserito, public as $$
  select b.arte_nombre, b.arte_descripcion, b.arte_imagen_url, b.arte_laminas,
         (select count(*)::int from caserito.laminas la join caserito.locales l on l.id = la.local_id
           where la.usuario_id = auth.uid() and l.barrio_id = b.id),
         (select nombre from caserito.locales where id = b.arte_local_id),
         c.codigo, c.canjeado_at
    from caserito.barrios b
    left join caserito.cambios_arte c on c.barrio_id = b.id and c.usuario_id = auth.uid()
   where b.id = p_barrio and b.arte_nombre is not null and b.arte_laminas is not null;
$$;

create or replace function caserito.pedir_arte(p_barrio text)
returns text language plpgsql security definer set search_path = caserito, public as $$
declare v_b caserito.barrios; v_tengo int; v_codigo text; v_listo timestamptz;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into v_b from caserito.barrios where id = p_barrio;
  if not found or v_b.arte_nombre is null or v_b.arte_laminas is null then raise exception 'Este barrio todavía no tiene arte para cambiar'; end if;
  if v_b.arte_local_id is null then raise exception 'Todavía no hay un local donde retirar el arte de este barrio'; end if;
  select codigo, canjeado_at into v_codigo, v_listo from caserito.cambios_arte where usuario_id = auth.uid() and barrio_id = p_barrio;
  if v_listo is not null then raise exception 'Ya cambiaste tu arte de este barrio'; end if;
  if v_codigo is not null then return v_codigo; end if;
  select count(*) into v_tengo from caserito.laminas la join caserito.locales l on l.id = la.local_id
   where la.usuario_id = auth.uid() and l.barrio_id = p_barrio;
  if v_tengo < v_b.arte_laminas then
    if v_b.arte_laminas - v_tengo = 1 then raise exception 'Te falta 1 lámina de este barrio'; end if;
    raise exception 'Te faltan % láminas de este barrio', v_b.arte_laminas - v_tengo;
  end if;
  insert into caserito.cambios_arte (usuario_id, barrio_id) values (auth.uid(), p_barrio) returning codigo into v_codigo;
  return v_codigo;
end $$;

-- Canjear: drops, repetidas (R…) y ahora el arte del barrio (A…)
create or replace function caserito.canjear(p_codigo text)
returns table (titulo text, beneficio text, canjeados bigint, lamina_nueva boolean, tipo text)
language plpgsql security definer set search_path = caserito, public as $$
declare v_part caserito.participaciones%rowtype; v_drop caserito.drops%rowtype; v_nueva boolean;
        v_cambio caserito.cambios_repetidas%rowtype; v_codigo text := upper(replace(p_codigo, ' ', ''));
        v_arte caserito.cambios_arte%rowtype; v_barrio caserito.barrios%rowtype;
begin
  -- Cambio por el arte del barrio (códigos que empiezan con A)
  select * into v_arte from caserito.cambios_arte where codigo = v_codigo for update;
  if found then
    select * into v_barrio from caserito.barrios where id = v_arte.barrio_id;
    if not (caserito.es_admin() or (v_barrio.arte_local_id is not null and caserito.tiene_permiso(v_barrio.arte_local_id, 'escanear'))) then
      raise exception 'Este arte se retira en otro local';
    end if;
    if v_arte.canjeado_at is not null then raise exception 'Este arte ya se entregó'; end if;
    update caserito.cambios_arte set canjeado_at = now(), canjeado_en = v_barrio.arte_local_id where id = v_arte.id;
    return query select ('Arte de ' || v_barrio.nombre)::text, coalesce(v_barrio.arte_nombre, 'Arte del barrio'), null::bigint, false, 'arte'::text;
    return;
  end if;

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


revoke all on function caserito.mi_arte(text), caserito.pedir_arte(text), caserito.canjear(text) from public, anon;
grant execute on function caserito.mi_arte(text), caserito.pedir_arte(text), caserito.canjear(text) to authenticated;

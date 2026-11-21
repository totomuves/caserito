-- 021 · El arte del barrio es uno solo: lo gana el PRIMERO que junta las láminas.
-- Si el ganador no lo retira en 7 días, el arte vuelve a quedar libre.
-- Cuando el admin cambia el arte del barrio, parte una ronda nueva.
alter table caserito.barrios add column if not exists arte_ronda int not null default 1;
alter table caserito.cambios_arte add column if not exists ronda int not null default 1;
alter table caserito.cambios_arte drop constraint if exists cambios_arte_usuario_id_barrio_id_key;
create unique index if not exists cambios_arte_un_ganador on caserito.cambios_arte (barrio_id, ronda);

-- Arte nuevo = ronda nueva
create or replace function caserito.arte_nueva_ronda() returns trigger
language plpgsql as $$
begin
  if new.arte_nombre is distinct from old.arte_nombre then new.arte_ronda := old.arte_ronda + 1; end if;
  return new;
end $$;
drop trigger if exists arte_nueva_ronda on caserito.barrios;
create trigger arte_nueva_ronda before update on caserito.barrios for each row execute function caserito.arte_nueva_ronda();

-- Libera el premio si el ganador no lo retiró en 7 días
create or replace function caserito.liberar_arte_vencido(p_barrio text) returns void
language sql security definer set search_path = caserito, public as $$
  delete from caserito.cambios_arte c using caserito.barrios b
   where b.id = p_barrio and c.barrio_id = b.id and c.ronda = b.arte_ronda
     and c.canjeado_at is null and c.creado_at < now() - interval '7 days';
$$;

drop function if exists caserito.mi_arte(text);
create function caserito.mi_arte(p_barrio text)
returns table (nombre text, descripcion text, imagen text, necesarias int, tengo int, punto text,
               codigo text, canjeado_at timestamptz, ganado boolean, ganador text, ganado_at timestamptz, vence_at timestamptz)
language plpgsql security definer set search_path = caserito, public as $$
begin
  perform caserito.liberar_arte_vencido(p_barrio);
  return query
  select b.arte_nombre, b.arte_descripcion, b.arte_imagen_url, b.arte_laminas,
         (select count(*)::int from caserito.laminas la join caserito.locales l on l.id = la.local_id
           where la.usuario_id = auth.uid() and l.barrio_id = b.id),
         (select lo.nombre from caserito.locales lo where lo.id = b.arte_local_id),
         case when c.usuario_id = auth.uid() then c.codigo end,
         case when c.usuario_id = auth.uid() then c.canjeado_at end,
         c.id is not null,
         case when c.id is null then null else coalesce(nullif(p.nombre, ''), 'Un caserito') end,
         c.creado_at,
         case when c.id is not null and c.canjeado_at is null then c.creado_at + interval '7 days' end
    from caserito.barrios b
    left join caserito.cambios_arte c on c.barrio_id = b.id and c.ronda = b.arte_ronda
    left join caserito.perfiles p on p.id = c.usuario_id
   where b.id = p_barrio and b.arte_nombre is not null and b.arte_laminas is not null;
end $$;

create or replace function caserito.pedir_arte(p_barrio text)
returns text language plpgsql security definer set search_path = caserito, public as $$
declare v_b caserito.barrios; v_tengo int; v_c caserito.cambios_arte%rowtype; v_codigo text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  perform caserito.liberar_arte_vencido(p_barrio);
  select * into v_b from caserito.barrios where id = p_barrio for update;
  if not found or v_b.arte_nombre is null or v_b.arte_laminas is null then raise exception 'Este barrio todavía no tiene arte para ganar'; end if;
  if v_b.arte_local_id is null then raise exception 'Todavía no hay un local donde retirar el arte de este barrio'; end if;
  select * into v_c from caserito.cambios_arte where barrio_id = p_barrio and ronda = v_b.arte_ronda;
  if found then
    if v_c.usuario_id = auth.uid() then
      if v_c.canjeado_at is not null then raise exception 'Ya retiraste este arte'; end if;
      return v_c.codigo;
    end if;
    raise exception 'Llegaste tarde: otro caserito ya ganó este arte';
  end if;
  select count(*) into v_tengo from caserito.laminas la join caserito.locales l on l.id = la.local_id
   where la.usuario_id = auth.uid() and l.barrio_id = p_barrio;
  if v_tengo < v_b.arte_laminas then
    if v_b.arte_laminas - v_tengo = 1 then raise exception 'Te falta 1 lámina de este barrio'; end if;
    raise exception 'Te faltan % láminas de este barrio', v_b.arte_laminas - v_tengo;
  end if;
  insert into caserito.cambios_arte (usuario_id, barrio_id, ronda) values (auth.uid(), p_barrio, v_b.arte_ronda)
  returning codigo into v_codigo;
  return v_codigo;
exception when unique_violation then
  raise exception 'Llegaste tarde: otro caserito ya ganó este arte';
end $$;

revoke all on function caserito.mi_arte(text), caserito.pedir_arte(text), caserito.liberar_arte_vencido(text) from public, anon;
grant execute on function caserito.mi_arte(text), caserito.pedir_arte(text) to authenticated;

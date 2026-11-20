-- =========================================================
-- CASERITO · 013 · Eliminar un local
-- Lo puede eliminar su dueño (desde "Editar mi local") o el admin
-- (desde Admin → Locales). Hay que escribir el nombre del local
-- para confirmar. Se borra todo lo del local: drops, canjes,
-- láminas, reseñas, equipo y roles. No se puede deshacer.
-- Pegar completo en SQL Editor → Run (una vez).
-- =========================================================
create or replace function caserito.eliminar_local(p_local uuid, p_confirmacion text)
returns void language plpgsql security definer set search_path = caserito, public as $$
declare v_nombre text; v_dueno uuid;
begin
  select nombre, dueno_id into v_nombre, v_dueno from caserito.locales where id = p_local;
  if not found then raise exception 'Ese local no existe'; end if;
  if auth.uid() is null or (auth.uid() <> v_dueno and not caserito.es_admin()) then
    raise exception 'Solo el dueño del local o el admin pueden eliminarlo';
  end if;
  if lower(btrim(coalesce(p_confirmacion, ''))) <> lower(btrim(v_nombre)) then
    raise exception 'Escribe el nombre del local tal cual para confirmar';
  end if;
  -- el equipo primero (sus roles se borran con el local)
  if to_regclass('caserito.equipo') is not null then
    execute 'delete from caserito.equipo where local_id = $1' using p_local;
  end if;
  delete from caserito.locales where id = p_local;
end $$;
revoke all on function caserito.eliminar_local(uuid, text) from public, anon;
grant execute on function caserito.eliminar_local(uuid, text) to authenticated;

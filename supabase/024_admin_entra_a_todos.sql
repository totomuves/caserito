-- 024 · El admin general puede entrar a cualquier local con todos los permisos
create or replace function caserito.permisos_en_local(p_local uuid)
returns text[] language sql stable security definer set search_path = caserito, public as $$
  select case
    when auth.uid() is null then '{}'::text[]
    when caserito.es_dueno(p_local) or caserito.es_admin() then caserito.permisos_validos() || array['equipo']
    else coalesce((select r.permisos from caserito.equipo e join caserito.roles_local r on r.id = e.rol_id
                    where e.local_id = p_local and e.usuario_id = auth.uid()), '{}'::text[])
  end;
$$;

-- 023 · Premios en el dashboard del local: cambios de láminas repetidas y entregas del arte del barrio
create or replace function caserito.premios_del_local(p_local uuid, p_desde timestamptz default now() - interval '90 days')
returns table (tipo text, premio text, cantidad int, caserito text, pedido_at timestamptz, entregado_at timestamptz, estado text)
language plpgsql stable security definer set search_path = caserito, public as $$
begin
  if not (caserito.es_admin() or caserito.tiene_permiso(p_local, 'resultados') or caserito.tiene_permiso(p_local, 'escanear')) then
    raise exception 'No tienes acceso a los premios de este local';
  end if;
  return query
  select 'repetidas'::text, c.premio, c.cantidad, coalesce(nullif(p.nombre, ''), 'Caserito'), c.creado_at, c.canjeado_at,
         case when c.canjeado_at is not null then 'entregado' when c.expira_at < now() then 'vencido' else 'pendiente' end
    from caserito.cambios_repetidas c left join caserito.perfiles p on p.id = c.usuario_id
   where c.local_id = p_local and c.creado_at >= p_desde
  union all
  select 'arte'::text, coalesce(b.arte_nombre, 'Arte del barrio'), b.arte_laminas, coalesce(nullif(p.nombre, ''), 'Caserito'), a.creado_at, a.canjeado_at,
         case when a.canjeado_at is not null then 'entregado' else 'pendiente' end
    from caserito.cambios_arte a join caserito.barrios b on b.id = a.barrio_id left join caserito.perfiles p on p.id = a.usuario_id
   where (a.canjeado_en = p_local or (a.canjeado_at is null and b.arte_local_id = p_local)) and a.creado_at >= p_desde
  order by 5 desc;
end $$;
revoke all on function caserito.premios_del_local(uuid, timestamptz) from public, anon;
grant execute on function caserito.premios_del_local(uuid, timestamptz) to authenticated;

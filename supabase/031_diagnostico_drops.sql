-- =========================================================
-- DROPER · 031 · Diagnóstico de drops (admin)
-- Lista los drops de hoy y dice si se ven en la app o, si no, por qué.
-- Pegar completo en SQL Editor → Run. Se puede correr más de una vez.
-- =========================================================
create or replace function caserito.diagnostico_drops()
returns table (drop_id uuid, local text, titulo text, parte timestamptz, termina timestamptz, quedan bigint,
               lat double precision, lng double precision, se_ve boolean, motivo text)
language sql stable security definer set search_path = caserito, public, extensions as $$
  select d.id, l.nombre, d.titulo, d.inicia_at, d.termina_at, e.quedan,
         st_y(l.ubicacion::geometry), st_x(l.ubicacion::geometry),
         (l.activo and l.aprobado and l.ubicacion is not null and now() between d.inicia_at and d.termina_at and coalesce(e.quedan, 0) > 0),
         case
           when not l.aprobado then 'El local no está aprobado (Admin → Locales → Aprobar)'
           when not l.activo then 'El local está desactivado'
           when l.ubicacion is null then 'El local no tiene ubicación (Editar mi local → marcar ubicación)'
           when d.inicia_at > now() then 'Todavía no parte (programado)'
           when d.termina_at < now() then 'Ya terminó'
           when coalesce(e.quedan, 0) <= 0 then 'Se acabaron los cupos'
           else 'Se ve en la app (a menos de 3 km en el inicio; en todo Santiago en el mapa)'
         end
  from caserito.drops d
  join caserito.locales l on l.id = d.local_id
  left join caserito.drops_estado e on e.drop_id = d.id
  where caserito.es_admin() and d.termina_at > now() - interval '12 hours'
  order by d.termina_at desc;
$$;
grant execute on function caserito.diagnostico_drops() to authenticated;

-- 022 · Cada barrio puede tener su propio estilo (skin). Vacío = usa el estilo general.
alter table caserito.barrios add column if not exists estilo text
  check (estilo is null or estilo in ('clasico', 'bauhaus', 'diario'));

-- El mapa de barrios ahora también dice el estilo de cada barrio
drop function if exists caserito.barrios_mapa();
create function caserito.barrios_mapa()
returns table (id text, nombre text, comuna text, lanzado boolean, orden int, limite jsonb, lat double precision, lng double precision, locales bigint, estilo text)
language sql stable security definer set search_path = caserito, extensions, public as $$
  select b.id, b.nombre, b.comuna, b.lanzado, b.orden,
         st_asgeojson(b.limite)::jsonb,
         st_y(st_centroid(b.limite::geometry)), st_x(st_centroid(b.limite::geometry)),
         (select count(*) from caserito.locales l where l.barrio_id = b.id and l.activo and l.aprobado),
         b.estilo
    from caserito.barrios b where b.activo order by b.orden;
$$;
revoke all on function caserito.barrios_mapa() from public;
grant execute on function caserito.barrios_mapa() to anon, authenticated;

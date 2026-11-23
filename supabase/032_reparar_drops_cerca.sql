-- =========================================================
-- DROPER · 032 · Reparar la búsqueda de drops (drops_cerca)
-- Vuelve a crear la función que usa la app para encontrar drops,
-- con los mismos filtros que el diagnóstico del admin, y al final la prueba.
-- Pegar completo en SQL Editor → Run. Se puede correr más de una vez.
-- =========================================================
drop function if exists caserito.drops_cerca(double precision, double precision, int);
drop function if exists caserito.drops_cerca(double precision, double precision, integer);
drop function if exists caserito.drops_cerca(numeric, numeric, int);

create function caserito.drops_cerca(lat double precision, lng double precision, radio_m int default 1500)
returns table (
  drop_id uuid, local_id uuid, local_nombre text, categoria text, tipo text, titulo text,
  frase text, precio int, termina_at timestamptz, cuadras int, quedan bigint,
  nivel_actual text, dentro_del_radio boolean, categorias text[]
)
language sql stable security definer set search_path = caserito, public, extensions as $$
  select d.id, l.id, l.nombre, l.categoria, d.tipo, d.titulo,
         case when d.frase_aprobada then d.frase end,
         d.precio, d.termina_at,
         greatest(1, round(st_distance(l.ubicacion, st_makepoint(drops_cerca.lng, drops_cerca.lat)::geography) / 100.0))::int,
         coalesce(e.quedan, d.cupo::bigint), e.nivel_actual,
         st_dwithin(l.ubicacion, st_makepoint(drops_cerca.lng, drops_cerca.lat)::geography, coalesce(l.radio_m, 300)),
         l.categorias
  from caserito.drops d
  join caserito.locales l on l.id = d.local_id
  left join caserito.drops_estado e on e.drop_id = d.id
  where l.activo and l.aprobado and l.ubicacion is not null
    and now() between d.inicia_at and d.termina_at
    and coalesce(e.quedan, d.cupo) > 0
    and st_dwithin(l.ubicacion, st_makepoint(drops_cerca.lng, drops_cerca.lat)::geography, drops_cerca.radio_m)
  order by 10;
$$;
revoke execute on function caserito.drops_cerca(double precision, double precision, int) from public;
grant execute on function caserito.drops_cerca(double precision, double precision, int) to anon, authenticated;

-- Avisarle a la API que hay una función nueva (si no, puede seguir usando la vieja un rato)
notify pgrst, 'reload schema';

-- Prueba: drops cerca de Barrio Italia (deberían salir los que están vivos)
select local_nombre, titulo, cuadras, quedan from caserito.drops_cerca(-33.4430, -70.6222, 3000);

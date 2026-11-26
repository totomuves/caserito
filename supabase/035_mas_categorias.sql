-- =========================================================
-- DROPPER · 035 · Más categorías de locales
-- Nuevas: gimnasios y deporte, bicicletas y talleres de bicis,
-- juegos de mesa / cartas / cómics, y tecnología y reparación de celulares.
-- Pegar completo en SQL Editor → Run. Se puede correr más de una vez.
-- =========================================================
create or replace function caserito.categorias_validas()
returns text[] language sql immutable as $$
  select array[
    -- Comer y tomar
    'comer','tomar','cafe','dulce','almacen',
    -- Salir
    'envivo',
    -- Tiendas
    'diseno','deco','antiguedades','ropa','accesorios','libros','musica','arte','plantas','juegos','tecnologia',
    -- Servicios
    'belleza','bienestar','deporte','bicis','mascotas','otros'
  ]::text[];
$$;

notify pgrst, 'reload schema';

-- Prueba: deberían aparecer las 4 nuevas
select unnest(caserito.categorias_validas()) as categoria;

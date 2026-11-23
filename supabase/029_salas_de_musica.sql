-- =========================================================
-- DROPER · 029 · Categoría nueva: "Salas y música en vivo"
-- (distinta de "Música, rock y vinilos", que son tiendas)
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
    'diseno','deco','antiguedades','ropa','accesorios','libros','musica','arte','plantas',
    -- Servicios
    'belleza','bienestar','mascotas','otros'
  ]::text[];
$$;

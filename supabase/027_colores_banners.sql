-- =========================================================
-- DROPER · 027 · Colores de los banners del inicio (paleta Bauhaus)
-- El admin elige el color de: cabecera, "Cerca de ti", la frase y "Droper aprendió que…".
-- Se guarda en caserito.ajustes con la clave 'banners' (JSON).
-- Pegar completo en SQL Editor → Run (una vez).
-- =========================================================
create or replace function caserito.fijar_banners(p_banners jsonb)
returns jsonb language plpgsql security definer set search_path = caserito, public as $$
declare
  k text;
  v text;
  limpio jsonb := '{}'::jsonb;
begin
  if not caserito.es_admin() then raise exception 'Solo el admin puede cambiar los colores'; end if;
  foreach k in array array['cabecera', 'cerca', 'frase', 'aprendio'] loop
    v := p_banners ->> k;
    if v is not null then
      if v not in ('amarillo', 'rojo', 'azul', 'negro', 'blanco') then raise exception 'Color fuera de la paleta: %', v; end if;
      limpio := limpio || jsonb_build_object(k, v);
    end if;
  end loop;
  insert into caserito.ajustes (clave, valor, actualizado_at) values ('banners', limpio::text, now())
  on conflict (clave) do update set valor = excluded.valor, actualizado_at = now();
  return limpio;
end $$;
revoke all on function caserito.fijar_banners(jsonb) from public, anon;
grant execute on function caserito.fijar_banners(jsonb) to authenticated;

-- =========================================================
-- CASERITO · 010 · Resumen del admin con caseritos reales
-- Antes "caseritos" contaba cada teléfono o navegador que abrió
-- la app (cada uno crea un perfil anónimo). Ahora se separa:
--   caseritos  = se sumaron a al menos un drop
--   con_cuenta = guardaron su cuenta con correo
--   visitas    = teléfonos/navegadores que abrieron la app
-- Sin contar dueños de locales ni admins.
-- Pegar completo en SQL Editor → Run (una vez).
-- =========================================================
create or replace function caserito.admin_resumen()
returns json
language plpgsql stable security definer set search_path = caserito, public as $$
declare r json;
begin
  if not caserito.es_admin() then raise exception 'Solo para el admin'; end if;
  with gente as (
    select p.id, p.creado_at, u.email, coalesce(u.is_anonymous, false) as anonimo
      from caserito.perfiles p
      left join auth.users u on u.id = p.id
     where not exists (select 1 from caserito.locales l where l.dueno_id = p.id)
       and not exists (select 1 from caserito.admins a where a.user_id = p.id)
  )
  select json_build_object(
    'locales',            (select count(*) from caserito.locales),
    'locales_aprobados',  (select count(*) from caserito.locales where aprobado),
    'locales_pendientes', (select count(*) from caserito.locales where not aprobado),
    'caseritos',          (select count(*) from gente g where exists (select 1 from caserito.participaciones x where x.usuario_id = g.id)),
    'con_cuenta',         (select count(*) from gente where not anonimo and email is not null),
    'visitas',            (select count(*) from gente),
    'visitas_semana',     (select count(*) from gente where creado_at > now() - interval '7 days'),
    'drops_activos',      (select count(*) from caserito.drops where now() between inicia_at and termina_at),
    'drops_semana',       (select count(*) from caserito.drops where creado_at > now() - interval '7 days'),
    'canjes_hoy',         (select count(*) from caserito.participaciones where canjeado_at::date = now()::date),
    'canjes_semana',      (select count(*) from caserito.participaciones where canjeado_at > now() - interval '7 days'),
    'ventas_semana',      (select coalesce(sum(d.precio), 0) from caserito.participaciones p
                             join caserito.drops d on d.id = p.drop_id
                            where p.canjeado_at > now() - interval '7 days'),
    'resenas',            (select count(*) from caserito.resenas)
  ) into r;
  return r;
end $$;

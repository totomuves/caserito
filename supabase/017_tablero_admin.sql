-- =========================================================
-- CASERITO · 017 · Tablero del admin general
-- Todo en una consulta: números de la plataforma, canjes de los
-- últimos 30 días, cada barrio, los locales que más mueven y las
-- alertas (locales por aprobar, locales dormidos, reseñas bajas,
-- comentarios sin leer). Requiere 009, 010 y 015.
-- Pegar completo en SQL Editor → Run (una vez).
-- =========================================================
create or replace function caserito.admin_tablero()
returns json
language plpgsql stable security definer set search_path = caserito, public as $$
declare r json;
begin
  if not caserito.es_admin() then raise exception 'Solo para el admin'; end if;
  with
  gente as (
    select p.id, p.creado_at, coalesce(u.is_anonymous, false) as anonimo, u.email
      from caserito.perfiles p left join auth.users u on u.id = p.id
     where not exists (select 1 from caserito.locales l where l.dueno_id = p.id)
       and not exists (select 1 from caserito.admins a where a.user_id = p.id)
  ),
  canjes as (
    select x.usuario_id, x.canjeado_at, x.anotado_at, d.precio, d.local_id, l.barrio_id
      from caserito.participaciones x
      join caserito.drops d on d.id = x.drop_id
      join caserito.locales l on l.id = d.local_id
  ),
  dias as (select generate_series((now() at time zone 'America/Santiago')::date - 29, (now() at time zone 'America/Santiago')::date, interval '1 day')::date as dia)
  select json_build_object(
    'kpis', json_build_object(
      'ventas_semana',      (select coalesce(sum(precio), 0) from canjes where canjeado_at > now() - interval '7 days'),
      'ventas_semana_ant',  (select coalesce(sum(precio), 0) from canjes where canjeado_at between now() - interval '14 days' and now() - interval '7 days'),
      'canjes_hoy',         (select count(*) from canjes where (canjeado_at at time zone 'America/Santiago')::date = (now() at time zone 'America/Santiago')::date),
      'canjes_semana',      (select count(*) from canjes where canjeado_at > now() - interval '7 days'),
      'canjes_semana_ant',  (select count(*) from canjes where canjeado_at between now() - interval '14 days' and now() - interval '7 days'),
      'anotados_semana',    (select count(*) from canjes where anotado_at > now() - interval '7 days'),
      'caseritos',          (select count(distinct usuario_id) from canjes where canjeado_at is not null),
      'caseritos_semana',   (select count(distinct usuario_id) from canjes where canjeado_at > now() - interval '7 days'),
      'caseritos_vuelven',  (select count(*) from (select usuario_id from canjes where canjeado_at is not null group by usuario_id having count(distinct local_id) >= 2 or count(*) >= 2) t),
      'con_cuenta',         (select count(*) from gente where not anonimo and email is not null),
      'visitas',            (select count(*) from gente),
      'visitas_semana',     (select count(*) from gente where creado_at > now() - interval '7 days'),
      'locales',            (select count(*) from caserito.locales where aprobado and activo),
      'locales_pendientes', (select count(*) from caserito.locales where not aprobado),
      'drops_activos',      (select count(*) from caserito.drops where now() between inicia_at and termina_at),
      'drops_semana',       (select count(*) from caserito.drops where creado_at > now() - interval '7 days'),
      'nota',               (select round(avg(estrellas)::numeric, 1) from caserito.resenas where not oculta),
      'resenas',            (select count(*) from caserito.resenas)
    ),
    'serie', (select json_agg(json_build_object('dia', d.dia,
                'canjes', (select count(*) from canjes c where (c.canjeado_at at time zone 'America/Santiago')::date = d.dia),
                'ventas', (select coalesce(sum(precio), 0) from canjes c where (c.canjeado_at at time zone 'America/Santiago')::date = d.dia)) order by d.dia) from dias d),
    'barrios', (select json_agg(json_build_object(
                'id', b.id, 'nombre', b.nombre, 'comuna', b.comuna, 'lanzado', b.lanzado,
                'locales', (select count(*) from caserito.locales l where l.barrio_id = b.id and l.aprobado and l.activo),
                'pendientes', (select count(*) from caserito.locales l where l.barrio_id = b.id and not l.aprobado),
                'drops_activos', (select count(*) from caserito.drops d join caserito.locales l on l.id = d.local_id where l.barrio_id = b.id and now() between d.inicia_at and d.termina_at),
                'canjes_semana', (select count(*) from canjes c where c.barrio_id = b.id and c.canjeado_at > now() - interval '7 days'),
                'ventas_semana', (select coalesce(sum(precio), 0) from canjes c where c.barrio_id = b.id and c.canjeado_at > now() - interval '7 days'),
                'caseritos_semana', (select count(distinct usuario_id) from canjes c where c.barrio_id = b.id and c.canjeado_at > now() - interval '7 days')
              ) order by b.orden) from caserito.barrios b where b.activo),
    'top_locales', (select json_agg(t) from (
                select l.id, l.nombre, l.barrio,
                       count(c.*) filter (where c.canjeado_at > now() - interval '7 days') as canjes,
                       coalesce(sum(c.precio) filter (where c.canjeado_at > now() - interval '7 days'), 0) as ventas,
                       (select count(*) from caserito.drops d where d.local_id = l.id and d.creado_at > now() - interval '7 days') as drops
                  from caserito.locales l left join canjes c on c.local_id = l.id
                 where l.aprobado and l.activo
                 group by l.id, l.nombre, l.barrio
                 order by 4 desc, 5 desc limit 10) t),
    'alertas', json_build_object(
      'por_aprobar', (select json_agg(json_build_object('id', id, 'nombre', nombre, 'barrio', barrio, 'desde', creado_at) order by creado_at) from caserito.locales where not aprobado),
      'dormidos', (select json_agg(json_build_object('id', l.id, 'nombre', l.nombre, 'barrio', l.barrio,
                    'ultimo_drop', (select max(d.inicia_at) from caserito.drops d where d.local_id = l.id)) order by l.nombre)
                     from caserito.locales l
                    where l.aprobado and l.activo
                      and not exists (select 1 from caserito.drops d where d.local_id = l.id and d.inicia_at > now() - interval '14 days')),
      'resenas_bajas', (select json_agg(json_build_object('local', l.nombre, 'estrellas', r.estrellas, 'texto', r.texto, 'fecha', r.creado_at) order by r.creado_at desc)
                     from caserito.resenas r join caserito.locales l on l.id = r.local_id
                    where r.estrellas <= 2 and r.creado_at > now() - interval '30 days'),
      'comentarios', (select count(*) from caserito.comentarios where not leido)
    )
  ) into r;
  return r;
end $$;
revoke all on function caserito.admin_tablero() from public, anon;
grant execute on function caserito.admin_tablero() to authenticated;

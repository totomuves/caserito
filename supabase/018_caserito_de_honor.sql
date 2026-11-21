-- 018 · Caserito de Honor: a la 7ª visita a un local, la persona se saca una foto
-- y la IA (Gemini / Nano Banana) la convierte en lámina del álbum.
-- La foto original NO se guarda: solo la lámina final.

-- Bucket público para las láminas de honor (solo la función del servidor sube archivos)
insert into storage.buckets (id, name, public)
values ('caserito-retratos', 'caserito-retratos', true)
on conflict (id) do update set public = true;

create table if not exists caserito.retratos (
  usuario_id  uuid not null references caserito.perfiles(id) on delete cascade,
  local_id    uuid not null references caserito.locales(id) on delete cascade,
  imagen_url  text not null,
  creado_at   timestamptz not null default now(),
  primary key (usuario_id, local_id)
);
alter table caserito.retratos enable row level security;

drop policy if exists retratos_mios on caserito.retratos;
create policy retratos_mios on caserito.retratos for select using (usuario_id = auth.uid());
drop policy if exists retratos_borrar_mios on caserito.retratos;
create policy retratos_borrar_mios on caserito.retratos for delete using (usuario_id = auth.uid());
-- Los locales ven las láminas de honor de su local (para mostrarlas en el panel)
drop policy if exists retratos_del_local on caserito.retratos;
create policy retratos_del_local on caserito.retratos for select using (caserito.es_dueno(local_id));

grant select, delete on caserito.retratos to authenticated;

-- Visitas = canjes hechos en ese local
create or replace function caserito.visitas_en(p_usuario uuid, p_local uuid)
returns int language sql stable security definer set search_path = caserito, public as $$
  select count(*)::int
  from caserito.participaciones p
  join caserito.drops d on d.id = p.drop_id
  where p.usuario_id = p_usuario and d.local_id = p_local and p.canjeado_at is not null;
$$;

-- Mis locales para la lámina de honor: cuántas visitas llevo y si ya tengo la mía
create or replace function caserito.mis_honores()
returns table (local_id uuid, local_nombre text, categoria text, visitas int, imagen_url text)
language sql stable security definer set search_path = caserito, public as $$
  select l.id, l.nombre, l.categoria, caserito.visitas_en(auth.uid(), l.id), r.imagen_url
  from caserito.locales l
  left join caserito.retratos r on r.local_id = l.id and r.usuario_id = auth.uid()
  where exists (
    select 1 from caserito.participaciones p join caserito.drops d on d.id = p.drop_id
    where p.usuario_id = auth.uid() and d.local_id = l.id and p.canjeado_at is not null
  )
  order by 4 desc;
$$;

-- ¿Puede hacerse la lámina de honor en este local? (7 visitas o más)
create or replace function caserito.puede_honor(p_local uuid)
returns boolean language sql stable security definer set search_path = caserito, public as $$
  select auth.uid() is not null and caserito.visitas_en(auth.uid(), p_local) >= 7;
$$;

revoke all on function caserito.visitas_en(uuid, uuid) from public, anon, authenticated;
grant execute on function caserito.mis_honores() to authenticated;
grant execute on function caserito.puede_honor(uuid) to authenticated;

-- La función "retrato" del servidor necesita leer y escribir en el esquema caserito
grant usage on schema caserito to service_role;
grant all on all tables in schema caserito to service_role;

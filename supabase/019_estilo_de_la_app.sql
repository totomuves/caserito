-- 019 · Estilo gráfico de la app (lo elige el admin general por ahora)
-- 'clasico' (el primero, letras de pincel), 'bauhaus' o 'diario'
create table if not exists caserito.ajustes (
  clave text primary key,
  valor text not null,
  actualizado_at timestamptz not null default now()
);
alter table caserito.ajustes enable row level security;
drop policy if exists ajustes_leer on caserito.ajustes;
create policy ajustes_leer on caserito.ajustes for select using (true);
grant select on caserito.ajustes to anon, authenticated;

insert into caserito.ajustes (clave, valor) values ('estilo', 'bauhaus')
on conflict (clave) do nothing;

create or replace function caserito.fijar_estilo(p_estilo text)
returns text language plpgsql security definer set search_path = caserito, public as $$
begin
  if not caserito.es_admin() then raise exception 'Solo el admin puede cambiar el estilo'; end if;
  if p_estilo not in ('clasico', 'bauhaus', 'diario') then raise exception 'Estilo desconocido: %', p_estilo; end if;
  insert into caserito.ajustes (clave, valor, actualizado_at) values ('estilo', p_estilo, now())
  on conflict (clave) do update set valor = excluded.valor, actualizado_at = now();
  return p_estilo;
end $$;
revoke all on function caserito.fijar_estilo(text) from public, anon;
grant execute on function caserito.fijar_estilo(text) to authenticated;

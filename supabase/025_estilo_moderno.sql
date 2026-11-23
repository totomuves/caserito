-- 025 · Cuarto estilo de la app: Moderno
alter table caserito.barrios drop constraint if exists barrios_estilo_check;
alter table caserito.barrios add constraint barrios_estilo_check
  check (estilo is null or estilo in ('clasico', 'bauhaus', 'diario', 'moderno'));

create or replace function caserito.fijar_estilo(p_estilo text)
returns text language plpgsql security definer set search_path = caserito, public as $$
begin
  if not caserito.es_admin() then raise exception 'Solo el admin puede cambiar el estilo'; end if;
  if p_estilo not in ('clasico', 'bauhaus', 'diario', 'moderno') then raise exception 'Estilo desconocido: %', p_estilo; end if;
  insert into caserito.ajustes (clave, valor, actualizado_at) values ('estilo', p_estilo, now())
  on conflict (clave) do update set valor = excluded.valor, actualizado_at = now();
  return p_estilo;
end $$;

-- =========================================================
-- CASERITO · 006 · Eliminar lo de dogdate del proyecto
-- Borra SOLO lo de dogdate (schema public y su disparador de usuarios).
-- No toca el schema caserito, ni extensiones, ni usuarios.
-- NO se puede deshacer. Pegar completo en SQL Editor → Run (una vez).
-- =========================================================
begin;

-- 1) El disparador de dogdate al crear usuarios
drop trigger if exists on_auth_user_created on auth.users;

-- 2) Las tablas de dogdate (y lo que dependa de ellas)
drop table if exists
  public.ad_events, public.adopter_profiles, public.adoptions, public.ads,
  public.breeders, public.breeds, public.contract_signatures, public.contracts,
  public.messages, public.pets, public.profiles, public.swipes
  cascade;

-- 3) Las funciones de dogdate que quedan en public (no las de extensiones)
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind in ('f', 'p')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute 'drop function if exists ' || f || ' cascade';
  end loop;
end $$;

-- 4) Tipos propios de dogdate en public (enums, etc.)
do $$
declare t text;
begin
  for t in
    select format('%I.%I', n.nspname, ty.typname) from pg_type ty join pg_namespace n on n.oid = ty.typnamespace
    where n.nspname = 'public' and ty.typtype in ('e', 'd', 'c')
      and not exists (select 1 from pg_depend d where d.objid = ty.oid and d.deptype = 'e')
      and not exists (select 1 from pg_class c where c.reltype = ty.oid)
  loop
    execute 'drop type if exists ' || t || ' cascade';
  end loop;
end $$;

-- 5) Reglas de acceso a archivos de los buckets de dogdate
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') || coalesce(with_check, '')) ~ '(ad-images|breeder-docs|family-photos|pet-photos)'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

commit;

-- Después, a mano en el panel:
--   Storage → vaciar y borrar los buckets ad-images, breeder-docs, family-photos, pet-photos
--   Edge Functions → borrar las de dogdate, si hay

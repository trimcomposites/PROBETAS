-- Ejecutar manualmente en el editor SQL de Supabase.
-- Verificacion posterior:
-- select policyname, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename = 'PROBETA_BORRADORES'
-- order by policyname;

begin;

create table if not exists public."PROBETA_BORRADORES" (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public."PROBETA_BORRADORES" enable row level security;

drop policy if exists "PROBETA_BORRADORES_select_own" on public."PROBETA_BORRADORES";
drop policy if exists "PROBETA_BORRADORES_insert_own" on public."PROBETA_BORRADORES";
drop policy if exists "PROBETA_BORRADORES_update_own" on public."PROBETA_BORRADORES";
drop policy if exists "PROBETA_BORRADORES_delete_own" on public."PROBETA_BORRADORES";

create policy "PROBETA_BORRADORES_select_own"
on public."PROBETA_BORRADORES" for select to authenticated
using (public.current_user_is_approved() = true and owner_id = auth.uid());

create policy "PROBETA_BORRADORES_insert_own"
on public."PROBETA_BORRADORES" for insert to authenticated
with check (public.current_user_is_approved() = true and owner_id = auth.uid());

create policy "PROBETA_BORRADORES_update_own"
on public."PROBETA_BORRADORES" for update to authenticated
using (public.current_user_is_approved() = true and owner_id = auth.uid())
with check (public.current_user_is_approved() = true and owner_id = auth.uid());

create policy "PROBETA_BORRADORES_delete_own"
on public."PROBETA_BORRADORES" for delete to authenticated
using (public.current_user_is_approved() = true and owner_id = auth.uid());

commit;

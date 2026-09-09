alter table public.profiles
add column if not exists is_approved boolean not null default false;

alter table public.profiles
add column if not exists approved_at timestamptz;

update public.profiles
set
  is_approved = true,
  approved_at = coalesce(approved_at, created_at, timezone('utc', now()))
where is_approved = false;

create or replace function public.current_user_is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_approved from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.prevent_last_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_admins integer;
begin
  if tg_op = 'DELETE' then
    if old.role <> 'admin' or old.is_approved = false then
      return old;
    end if;

    select count(*)
    into remaining_admins
    from public.profiles
    where role = 'admin'
      and is_approved = true
      and id <> old.id;

    if remaining_admins = 0 then
      raise exception 'Debe existir al menos un administrador aprobado.';
    end if;

    return old;
  end if;

  if old.role = 'admin'
    and old.is_approved = true
    and (
      coalesce(new.role, 'lector') <> 'admin'
      or coalesce(new.is_approved, false) = false
    ) then
    select count(*)
    into remaining_admins
    from public.profiles
    where role = 'admin'
      and is_approved = true
      and id <> old.id;

    if remaining_admins = 0 then
      raise exception 'No puedes desactivar al ultimo administrador aprobado.';
    end if;
  end if;

  if coalesce(new.is_approved, false) = true and coalesce(old.is_approved, false) = false then
    new.approved_at = timezone('utc', now());
  elsif coalesce(new.is_approved, false) = false then
    new.approved_at = null;
  end if;

  return new;
end;
$$;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_admin_all on public.profiles;
drop policy if exists profiles_update_admin_all on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy profiles_select_admin_all
on public.profiles
for select
to authenticated
using (
  public.current_user_role() = 'admin'
  and public.current_user_is_approved() = true
);

create policy profiles_update_admin_all
on public.profiles
for update
to authenticated
using (
  public.current_user_role() = 'admin'
  and public.current_user_is_approved() = true
)
with check (
  role in ('lector', 'creador', 'editor', 'gestor', 'admin')
);

do $$
declare
  protected_tables text[] := array[
    'PROBETA',
    'probeta',
    'CAPA',
    'capa',
    'DIRECCION_CAPA',
    'direccion_capa',
    'PRE-IMPREGNADO',
    'PRE_IMPREGNADO',
    'pre_impregnado',
    'FABRICANTE',
    'fabricante',
    'PRE-IMPREGNADO_TYPE',
    'PRE_IMPREGNADO_TYPE',
    'pre_impregnado_type',
    'RESINA_SYSTEM',
    'resina_system',
    'FIBRAS_REFUERZO',
    'fibras_refuerzo',
    'RESULTS',
    'results',
    'ACABADO',
    'acabado',
    'ESPESORES',
    'espesores',
    'RECETAS',
    'recetas',
    'RECETA_ESCALONES',
    'receta_escalones',
    'HORNO',
    'horno',
    'PROBETA_CAPA',
    'probeta_capa',
    'PROBETA_PRE-IMPREGNADO',
    'PROBETA_PRE_IMPREGNADO',
    'probeta_pre_impregnado'
  ];
  table_name text;
begin
  foreach table_name in array protected_tables
  loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop policy if exists %I on public.%I', table_name || '_select_authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_role_based', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_role_based', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_role_based', table_name);

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.current_user_is_approved() = true)',
      table_name || '_select_authenticated',
      table_name
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.current_user_is_approved() = true and public.current_user_role() in (''creador'', ''editor'', ''gestor'', ''admin''))',
      table_name || '_insert_role_based',
      table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.current_user_is_approved() = true and public.current_user_role() in (''editor'', ''gestor'', ''admin'')) with check (public.current_user_is_approved() = true and public.current_user_role() in (''editor'', ''gestor'', ''admin''))',
      table_name || '_update_role_based',
      table_name
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.current_user_is_approved() = true and public.current_user_role() in (''gestor'', ''admin''))',
      table_name || '_delete_role_based',
      table_name
    );
  end loop;
end;
$$;

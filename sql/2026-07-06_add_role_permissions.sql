alter table public.profiles
add column if not exists role text not null default 'lector';

update public.profiles
set role = 'lector'
where role is null
   or role not in ('lector', 'creador', 'editor', 'gestor', 'admin');

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('lector', 'creador', 'editor', 'gestor', 'admin'));

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'lector'
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
    if old.role <> 'admin' then
      return old;
    end if;

    select count(*)
    into remaining_admins
    from public.profiles
    where role = 'admin'
      and id <> old.id;

    if remaining_admins = 0 then
      raise exception 'Debe existir al menos un administrador activo.';
    end if;

    return old;
  end if;

  if old.role = 'admin' and coalesce(new.role, 'lector') <> 'admin' then
    select count(*)
    into remaining_admins
    from public.profiles
    where role = 'admin'
      and id <> old.id;

    if remaining_admins = 0 then
      raise exception 'No puedes degradar al ultimo administrador.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_last_admin_change on public.profiles;
create trigger profiles_prevent_last_admin_change
before update or delete on public.profiles
for each row
execute function public.prevent_last_admin_change();

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
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
using (public.current_user_role() = 'admin');

create policy profiles_update_admin_all
on public.profiles
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (role in ('lector', 'creador', 'editor', 'gestor', 'admin'));

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

    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_all', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_select_authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_role_based', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_role_based', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_role_based', table_name);

    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      table_name || '_select_authenticated',
      table_name
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.current_user_role() in (''creador'', ''editor'', ''gestor'', ''admin''))',
      table_name || '_insert_role_based',
      table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.current_user_role() in (''editor'', ''gestor'', ''admin'')) with check (public.current_user_role() in (''editor'', ''gestor'', ''admin''))',
      table_name || '_update_role_based',
      table_name
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.current_user_role() in (''gestor'', ''admin''))',
      table_name || '_delete_role_based',
      table_name
    );
  end loop;
end;
$$;

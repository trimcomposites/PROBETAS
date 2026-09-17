-- Product Selector Guide fields and categories for resin systems.
-- Execute manually in the Supabase SQL Editor.

begin;

create table if not exists public."RESIN_PRODUCT_CATEGORY" (
  id bigint primary key,
  created_at timestamptz not null default timezone('utc', now()),
  alias text not null unique
);

insert into public."RESIN_PRODUCT_CATEGORY" (id, alias)
values
  (1, 'TOOLING PREPREG — Low Temperature Cure'),
  (2, 'ADHESIVE FILM'),
  (3, 'COMPONENT PREPREG — Low to Medium Temperature Cure'),
  (4, 'COMPONENT PREPREG — Versatile Temperature Cure'),
  (5, 'COMPONENT PREPREG — High Service Temperature'),
  (6, 'COMPONENT PREPREG — Flame Retardant')
on conflict (id) do update set alias = excluded.alias;

alter table public."RESINA_SYSTEM"
  add column if not exists description text,
  add column if not exists product_category_id bigint,
  add column if not exists fabricante_id bigint,
  add column if not exists outlife_at_20c text,
  add column if not exists initial_cure_temp_c text,
  add column if not exists initial_cure_time_hours text,
  add column if not exists post_cure_option boolean,
  add column if not exists max_tg_onset_c double precision,
  add column if not exists max_tg_peak_c double precision,
  add column if not exists toughened boolean,
  add column if not exists standard_process text,
  add column if not exists typical_application_areas text;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'resina_system_product_category_id_fkey'
  ) then
    alter table public."RESINA_SYSTEM"
      add constraint resina_system_product_category_id_fkey
      foreign key (product_category_id) references public."RESIN_PRODUCT_CATEGORY"(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'resina_system_fabricante_id_fkey'
  ) then
    alter table public."RESINA_SYSTEM"
      add constraint resina_system_fabricante_id_fkey
      foreign key (fabricante_id) references public."FABRICANTE"(id);
  end if;
end;
$constraints$;

-- Preserve any value saved by an earlier version of this migration.
do $backfill$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'RESINA_SYSTEM'
      and column_name = 'product_category'
  ) then
    execute $sql$
      update public."RESINA_SYSTEM" resin
      set product_category_id = category.id
      from public."RESIN_PRODUCT_CATEGORY" category
      where resin.product_category_id is null
        and lower(trim(resin.product_category)) = lower(category.alias)
    $sql$;
  end if;
end;
$backfill$;

alter table public."RESIN_PRODUCT_CATEGORY" enable row level security;

drop policy if exists resin_product_category_select_authenticated on public."RESIN_PRODUCT_CATEGORY";
drop policy if exists resin_product_category_insert_admin on public."RESIN_PRODUCT_CATEGORY";
drop policy if exists resin_product_category_update_admin on public."RESIN_PRODUCT_CATEGORY";
drop policy if exists resin_product_category_delete_admin on public."RESIN_PRODUCT_CATEGORY";

-- The catalogue is available as a selector on resin systems, while its dedicated
-- management section is only exposed to administrators by the application.
create policy resin_product_category_select_authenticated
on public."RESIN_PRODUCT_CATEGORY"
for select to authenticated
using (public.current_user_is_approved() = true);

create policy resin_product_category_insert_admin
on public."RESIN_PRODUCT_CATEGORY"
for insert to authenticated
with check (
  public.current_user_is_approved() = true
  and public.current_user_role() = 'admin'
);

create policy resin_product_category_update_admin
on public."RESIN_PRODUCT_CATEGORY"
for update to authenticated
using (
  public.current_user_is_approved() = true
  and public.current_user_role() = 'admin'
)
with check (
  public.current_user_is_approved() = true
  and public.current_user_role() = 'admin'
);

create policy resin_product_category_delete_admin
on public."RESIN_PRODUCT_CATEGORY"
for delete to authenticated
using (
  public.current_user_is_approved() = true
  and public.current_user_role() = 'admin'
);

notify pgrst, 'reload schema';

commit;

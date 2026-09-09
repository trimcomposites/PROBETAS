-- Archivo lógico de registros gestionables.
-- Ejecutar manualmente en Supabase SQL Editor.
-- La migración es idempotente y no archiva registros existentes.

begin;

do $archive$
declare
  target_table text;
  archive_tables constant text[] := array[
    'PROBETA',
    'FIBRAS_REFUERZO',
    'PRE-IMPREGNADO',
    'RECETAS',
    'FABRICANTE',
    'PRE-IMPREGNADO_TYPE',
    'RESINA_SYSTEM'
  ];
begin
  foreach target_table in array archive_tables loop
    execute format(
      'alter table public.%I add column if not exists archived_at timestamptz, add column if not exists archived_by uuid references auth.users(id)',
      target_table
    );
    execute format(
      'create index if not exists %I on public.%I (id) where archived_at is null',
      target_table || '_active_idx',
      target_table
    );
    execute format(
      'create index if not exists %I on public.%I (archived_at desc) where archived_at is not null',
      target_table || '_archived_idx',
      target_table
    );
  end loop;
end;
$archive$;

create or replace function public.enforce_record_archive_transition()
returns trigger
language plpgsql
set search_path = public, auth
as $function$
declare
  role_name text := public.current_user_role();
begin
  if new.archived_at is not distinct from old.archived_at then
    if new.archived_by is distinct from old.archived_by then
      raise exception 'archived_by solo puede cambiar junto al estado de archivo'
        using errcode = '42501';
    end if;

    return new;
  end if;

  if new.archived_at is not null then
    if role_name not in ('gestor', 'admin') then
      raise exception 'solo gestor o admin puede archivar registros'
        using errcode = '42501';
    end if;

    new.archived_at := now();
    new.archived_by := auth.uid();
    return new;
  end if;

  if role_name <> 'admin' then
    raise exception 'solo admin puede restaurar registros'
      using errcode = '42501';
  end if;

  new.archived_at := null;
  new.archived_by := null;
  return new;
end;
$function$;

do $archive$
declare
  target_table text;
  archive_tables constant text[] := array[
    'PROBETA',
    'FIBRAS_REFUERZO',
    'PRE-IMPREGNADO',
    'RECETAS',
    'FABRICANTE',
    'PRE-IMPREGNADO_TYPE',
    'RESINA_SYSTEM'
  ];
begin
  foreach target_table in array archive_tables loop
    execute format(
      'drop trigger if exists enforce_archive_transition on public.%I',
      target_table
    );
    execute format(
      'create trigger enforce_archive_transition before update on public.%I for each row execute function public.enforce_record_archive_transition()',
      target_table
    );
    execute format(
      'drop policy if exists %I on public.%I',
      target_table || '_archived_visibility',
      target_table
    );
    execute format(
      'create policy %I on public.%I as restrictive for select to authenticated using (archived_at is null or public.current_user_role() = ''admin'')',
      target_table || '_archived_visibility',
      target_table
    );
  end loop;
end;
$archive$;

create or replace function public.get_archived_reference_labels(reference_items jsonb)
returns table (
  owner_table text,
  owner_id bigint,
  field_name text,
  referenced_table text,
  referenced_id bigint,
  label text
)
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  item jsonb;
  requested_owner_table text;
  requested_field_name text;
  requested_referenced_table text;
  requested_owner_id bigint;
  requested_referenced_id bigint;
  relation_is_allowed boolean;
  owner_has_reference boolean;
  owner_is_visible boolean;
  archived_label text;
begin
  if public.current_user_is_approved() is not true then
    raise exception 'usuario no aprobado'
      using errcode = '42501';
  end if;

  for item in select value from jsonb_array_elements(coalesce(reference_items, '[]'::jsonb)) loop
    requested_owner_table := item->>'ownerTable';
    requested_owner_id := nullif(item->>'ownerId', '')::bigint;
    requested_field_name := item->>'fieldName';
    requested_referenced_table := item->>'referencedTable';
    requested_referenced_id := nullif(item->>'referencedId', '')::bigint;

    relation_is_allowed := (requested_owner_table, requested_field_name, requested_referenced_table) in (
      ('PROBETA', 'receta_id', 'RECETAS'),
      ('PRE-IMPREGNADO', 'type_id', 'PRE-IMPREGNADO_TYPE'),
      ('PRE-IMPREGNADO', 'fabricante_id', 'FABRICANTE'),
      ('PRE-IMPREGNADO', 'resina_system_id', 'RESINA_SYSTEM'),
      ('PRE-IMPREGNADO', 'fibra_refuerzo_id', 'FIBRAS_REFUERZO'),
      ('PRE-IMPREGNADO', 'fibra_refuerzo2_id', 'FIBRAS_REFUERZO'),
      ('CAPA', 'pre_impregnado_id', 'PRE-IMPREGNADO')
    );

    if not relation_is_allowed
      or requested_owner_id is null
      or requested_referenced_id is null then
      continue;
    end if;

    execute format(
      'select exists (select 1 from public.%I where id = $1 and %I = $2)',
      requested_owner_table,
      requested_field_name
    ) into owner_has_reference using requested_owner_id, requested_referenced_id;

    if not owner_has_reference then
      continue;
    end if;

    if requested_owner_table = 'CAPA' then
      select exists (
        select 1
        from public."PROBETA_CAPA" link
        join public."PROBETA" probeta on probeta.id = link.probeta_id
        where link.capa_id = requested_owner_id
          and probeta.archived_at is null
      ) into owner_is_visible;
    else
      execute format(
        'select exists (select 1 from public.%I where id = $1 and archived_at is null)',
        requested_owner_table
      ) into owner_is_visible using requested_owner_id;
    end if;

    if not owner_is_visible and public.current_user_role() <> 'admin' then
      continue;
    end if;

    case requested_referenced_table
      when 'PRE-IMPREGNADO' then
        select coalesce(nullif(text_id, ''), nullif(alias, ''), 'Registro ' || id::text)
          into archived_label
          from public."PRE-IMPREGNADO"
          where id = requested_referenced_id and archived_at is not null;
      when 'RECETAS' then
        select coalesce(nullif(nombre, ''), 'Registro ' || id::text)
          into archived_label
          from public."RECETAS"
          where id = requested_referenced_id and archived_at is not null;
      when 'FIBRAS_REFUERZO' then
        select coalesce(nullif(alias, ''), 'Registro ' || id::text)
          into archived_label
          from public."FIBRAS_REFUERZO"
          where id = requested_referenced_id and archived_at is not null;
      when 'FABRICANTE' then
        select coalesce(nullif(alias, ''), 'Registro ' || id::text)
          into archived_label
          from public."FABRICANTE"
          where id = requested_referenced_id and archived_at is not null;
      when 'PRE-IMPREGNADO_TYPE' then
        select coalesce(nullif(alias, ''), 'Registro ' || id::text)
          into archived_label
          from public."PRE-IMPREGNADO_TYPE"
          where id = requested_referenced_id and archived_at is not null;
      when 'RESINA_SYSTEM' then
        select coalesce(nullif(alias, ''), 'Registro ' || id::text)
          into archived_label
          from public."RESINA_SYSTEM"
          where id = requested_referenced_id and archived_at is not null;
    end case;

    if archived_label is not null then
      owner_table := requested_owner_table;
      owner_id := requested_owner_id;
      field_name := requested_field_name;
      referenced_table := requested_referenced_table;
      referenced_id := requested_referenced_id;
      label := archived_label || ' (Archivado)';
      return next;
    end if;
  end loop;
end;
$function$;

revoke all on function public.get_archived_reference_labels(jsonb) from public;
grant execute on function public.get_archived_reference_labels(jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;

-- Verificación posterior (ejecutar tras la migración):
-- select table_name, column_name
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('PROBETA', 'FIBRAS_REFUERZO', 'PRE-IMPREGNADO', 'RECETAS',
--                      'FABRICANTE', 'PRE-IMPREGNADO_TYPE', 'RESINA_SYSTEM')
--   and column_name in ('archived_at', 'archived_by')
-- order by table_name, column_name;
--
-- select tgname, tgrelid::regclass
-- from pg_trigger
-- where tgname = 'enforce_archive_transition' and not tgisinternal
-- order by tgrelid::regclass::text;

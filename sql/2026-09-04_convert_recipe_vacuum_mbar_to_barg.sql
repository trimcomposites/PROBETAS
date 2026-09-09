-- Conversión única de vacío: 1000 mbar = 1 bar(g).
-- Mantiene los nombres de columnas heredados para no romper vistas ni la aplicación.
-- La tabla de respaldo impide ejecutar la migración dos veces por accidente.

begin;

lock table public."RECETA_ESCALONES" in share row exclusive mode;

create table public."RECETA_ESCALONES_VACIO_MBAR_BACKUP_20260904" as
select *
from public."RECETA_ESCALONES";

do $$
declare
  source_count bigint;
  backup_count bigint;
  generated_expression text;
begin
  select count(*) into source_count from public."RECETA_ESCALONES";
  select count(*) into backup_count from public."RECETA_ESCALONES_VACIO_MBAR_BACKUP_20260904";

  if source_count <> backup_count then
    raise exception 'El respaldo de RECETA_ESCALONES no coincide con la tabla original.';
  end if;

  select generation_expression into generated_expression
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'RECETA_ESCALONES'
    and column_name = 'vacio_mbar';

  if generated_expression is null
    or generated_expression not ilike '%vacio_final_mbar%' then
    raise exception
      'vacio_mbar no se genera desde vacio_final_mbar; se detiene la conversión para proteger los datos. Expresión: %',
      coalesce(generated_expression, '<sin expresión generada>');
  end if;
end;
$$;

update public."RECETA_ESCALONES"
set
  vacio_final_mbar = vacio_final_mbar / 1000.0,
  vacio_mbar_por_min = vacio_mbar_por_min / 1000.0;

comment on column public."RECETA_ESCALONES".vacio_final_mbar is
'Objetivo de vacío expresado en bar(g). El nombre heredado de la columna se conserva por compatibilidad.';

comment on column public."RECETA_ESCALONES".vacio_mbar_por_min is
'Rampa de vacío expresada en bar(g)/min. El nombre heredado de la columna se conserva por compatibilidad.';

select
  count(*) as escalones_convertidos,
  min(vacio_final_mbar) as vacio_final_min_barg,
  max(vacio_final_mbar) as vacio_final_max_barg
from public."RECETA_ESCALONES";

commit;

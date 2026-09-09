begin;

do $$
declare
  receta_detalle_def text;
  receta_tiempo_ciclo_def text;
begin
  if to_regclass('public."V_RECETAS_DETALLE"') is not null then
    select pg_get_viewdef('public."V_RECETAS_DETALLE"'::regclass, true)
      into receta_detalle_def;
  end if;

  if to_regclass('public."V_RECETAS_TIEMPO_CICLO"') is not null then
    select pg_get_viewdef('public."V_RECETAS_TIEMPO_CICLO"'::regclass, true)
      into receta_tiempo_ciclo_def;
  end if;

  execute 'drop view if exists public."V_RECETAS_TIEMPO_CICLO"';
  execute 'drop view if exists public."V_RECETAS_DETALLE"';

  perform set_config('app.v_recetas_detalle_def', coalesce(receta_detalle_def, ''), true);
  perform set_config('app.v_recetas_tiempo_ciclo_def', coalesce(receta_tiempo_ciclo_def, ''), true);
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'RECETA_ESCALONES'
      and column_name = 'temp_dwell_min'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'RECETA_ESCALONES'
      and column_name = 'tiempo_min'
  ) then
    execute 'alter table public."RECETA_ESCALONES" rename column temp_dwell_min to tiempo_min';
  end if;
end $$;

alter table public."RECETA_ESCALONES"
  add column if not exists tiempo_min double precision;

do $$
declare
  fallback_expr text := 'tiempo_min';
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'RECETA_ESCALONES'
      and column_name = 'temp_dwell_min'
  ) then
    fallback_expr := fallback_expr || ', temp_dwell_min';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'RECETA_ESCALONES'
      and column_name = 'pres_tiempo_min'
  ) then
    fallback_expr := fallback_expr || ', pres_tiempo_min';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'RECETA_ESCALONES'
      and column_name = 'vacio_tiempo_min'
  ) then
    fallback_expr := fallback_expr || ', vacio_tiempo_min';
  end if;

  execute format(
    'update public."RECETA_ESCALONES" set tiempo_min = coalesce(%s) where tiempo_min is null',
    fallback_expr
  );
end $$;

alter table public."RECETA_ESCALONES"
  drop column if exists temp_dwell_min,
  drop column if exists pres_tiempo_min,
  drop column if exists vacio_tiempo_min,
  drop column if exists pres_rampa_min,
  drop column if exists vacio_rampa_min;

comment on column public."RECETA_ESCALONES".tiempo_min is
'Duracion comun del escalon en minutos para temperatura, presion y vacio.';

comment on column public."RECETA_ESCALONES".pres_dwell is
'Indica si el escalon mantiene la presion inicial y oculta presion final y rampa.';

comment on column public."RECETA_ESCALONES".vacio_dwell is
'Indica si el escalon mantiene el vacio inicial y oculta vacio final y rampa.';

update public."RECETA_ESCALONES"
set
  pres_final_bar = coalesce(pres_final_bar, presion_bar),
  vacio_final_mbar = coalesce(vacio_final_mbar, vacio_mbar)
where pres_final_bar is null
   or vacio_final_mbar is null;

do $$
declare
  receta_detalle_def text := nullif(current_setting('app.v_recetas_detalle_def', true), '');
  receta_tiempo_ciclo_def text := nullif(current_setting('app.v_recetas_tiempo_ciclo_def', true), '');
begin
  if receta_detalle_def is not null then
    receta_detalle_def := replace(receta_detalle_def, 'temp_dwell_min', 'tiempo_min');
    receta_detalle_def := replace(receta_detalle_def, 'pres_tiempo_min', 'tiempo_min');
    receta_detalle_def := replace(receta_detalle_def, 'vacio_tiempo_min', 'tiempo_min');

    execute 'create or replace view public."V_RECETAS_DETALLE" as ' || receta_detalle_def;
  end if;

  if receta_tiempo_ciclo_def is not null then
    receta_tiempo_ciclo_def := replace(receta_tiempo_ciclo_def, 'temp_dwell_min', 'tiempo_min');
    receta_tiempo_ciclo_def := replace(receta_tiempo_ciclo_def, 'pres_tiempo_min', 'tiempo_min');
    receta_tiempo_ciclo_def := replace(receta_tiempo_ciclo_def, 'vacio_tiempo_min', 'tiempo_min');

    execute 'create or replace view public."V_RECETAS_TIEMPO_CICLO" as ' || receta_tiempo_ciclo_def;
  end if;
end $$;

commit;

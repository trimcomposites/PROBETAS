begin;

alter table public."RECETA_ESCALONES"
  add column if not exists temp_tiempo_min double precision,
  add column if not exists temp_control_mode text not null default 'time',
  add column if not exists pres_tiempo_min double precision,
  add column if not exists pres_control_mode text not null default 'time',
  add column if not exists vacio_tiempo_min double precision,
  add column if not exists vacio_control_mode text not null default 'time';

update public."RECETA_ESCALONES"
set
  temp_tiempo_min = coalesce(temp_tiempo_min, tiempo_min),
  pres_tiempo_min = coalesce(pres_tiempo_min, tiempo_min),
  vacio_tiempo_min = coalesce(vacio_tiempo_min, tiempo_min),
  temp_control_mode = 'time',
  pres_control_mode = 'time',
  vacio_control_mode = 'time';

alter table public."RECETA_ESCALONES"
  drop constraint if exists receta_escalones_temp_control_mode_check,
  drop constraint if exists receta_escalones_pres_control_mode_check,
  drop constraint if exists receta_escalones_vacio_control_mode_check,
  add constraint receta_escalones_temp_control_mode_check check (temp_control_mode in ('time', 'ramp')),
  add constraint receta_escalones_pres_control_mode_check check (pres_control_mode in ('time', 'ramp')),
  add constraint receta_escalones_vacio_control_mode_check check (vacio_control_mode in ('time', 'ramp'));

alter table public."RECETAS" drop column if exists tiempo_ciclo_min;

-- Se conserva tiempo_min mientras las vistas heredadas V_RECETAS_DETALLE y
-- V_RECETAS_TIEMPO_CICLO dependan de ella. La aplicación ya no lo utiliza;
-- podrá eliminarse en una migración posterior al actualizar o retirar dichas vistas.

commit;

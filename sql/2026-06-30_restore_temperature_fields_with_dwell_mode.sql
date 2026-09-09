begin;

alter table public."RECETA_ESCALONES"
  add column if not exists temp_grados_por_min double precision,
  add column if not exists temp_final_c double precision,
  add column if not exists temp_dwell_min double precision,
  add column if not exists temp_dwell boolean not null default false;

comment on column public."RECETA_ESCALONES".temp_grados_por_min is
'Rampa de temperatura calculada en C/min cuando el escalon no esta en modo dwell.';

comment on column public."RECETA_ESCALONES".temp_final_c is
'Temperatura final objetivo del escalon cuando no esta en modo dwell.';

comment on column public."RECETA_ESCALONES".temp_dwell is
'Indica si el escalon mantiene la temperatura inicial y oculta temperatura final y rampa.';

comment on column public."RECETA_ESCALONES".temp_dwell_min is
'Duracion del escalon de temperatura en minutos.';

commit;

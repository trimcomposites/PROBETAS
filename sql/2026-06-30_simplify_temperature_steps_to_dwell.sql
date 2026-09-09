begin;

alter table public."RECETA_ESCALONES"
  add column if not exists temp_dwell boolean not null default false;

comment on column public."RECETA_ESCALONES".temp_dwell is
'Indica si el escalon mantiene la temperatura inicial sin rampa ni objetivo final.';

update public."RECETA_ESCALONES"
set temp_dwell = coalesce(temp_dwell, false);

alter table public."RECETA_ESCALONES"
  drop column if exists temp_grados_por_min,
  drop column if exists temp_final_c,
  drop column if exists temp_dwell_min,
  drop column if exists temp_rampa_min;

commit;

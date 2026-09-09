begin;

alter table public."RECETA_ESCALONES"
  add column if not exists pres_dwell boolean not null default false,
  add column if not exists vacio_dwell boolean not null default false;

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

commit;

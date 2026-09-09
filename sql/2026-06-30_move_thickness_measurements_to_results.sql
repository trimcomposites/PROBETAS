begin;

alter table public."RESULTS"
  add column if not exists t1 real,
  add column if not exists t2 real,
  add column if not exists t3 real,
  add column if not exists t4 real,
  add column if not exists t5 real,
  add column if not exists t6 real,
  add column if not exists t7 real,
  add column if not exists t8 real,
  add column if not exists has_uncured_thickness boolean not null default false,
  add column if not exists espesor_sin_curado real,
  add column if not exists uncured_t1 real,
  add column if not exists uncured_t2 real,
  add column if not exists uncured_t3 real,
  add column if not exists uncured_t4 real,
  add column if not exists uncured_t5 real,
  add column if not exists uncured_t6 real,
  add column if not exists uncured_t7 real,
  add column if not exists uncured_t8 real;

comment on column public."RESULTS".espesor is
'Espesor medio curado calculado desde los campos t1..t8.';

comment on column public."RESULTS".has_uncured_thickness is
'Indica si la probeta tiene cargada una segunda bateria de espesores sin curado.';

comment on column public."RESULTS".espesor_sin_curado is
'Espesor medio sin curado calculado desde uncured_t1..uncured_t8.';

comment on column public."RESULTS".t1 is 'Espesor curado T1.';
comment on column public."RESULTS".t2 is 'Espesor curado T2.';
comment on column public."RESULTS".t3 is 'Espesor curado T3.';
comment on column public."RESULTS".t4 is 'Espesor curado T4.';
comment on column public."RESULTS".t5 is 'Espesor curado T5.';
comment on column public."RESULTS".t6 is 'Espesor curado T6.';
comment on column public."RESULTS".t7 is 'Espesor curado T7.';
comment on column public."RESULTS".t8 is 'Espesor curado T8.';
comment on column public."RESULTS".uncured_t1 is 'Espesor sin curado T1.';
comment on column public."RESULTS".uncured_t2 is 'Espesor sin curado T2.';
comment on column public."RESULTS".uncured_t3 is 'Espesor sin curado T3.';
comment on column public."RESULTS".uncured_t4 is 'Espesor sin curado T4.';
comment on column public."RESULTS".uncured_t5 is 'Espesor sin curado T5.';
comment on column public."RESULTS".uncured_t6 is 'Espesor sin curado T6.';
comment on column public."RESULTS".uncured_t7 is 'Espesor sin curado T7.';
comment on column public."RESULTS".uncured_t8 is 'Espesor sin curado T8.';

commit;

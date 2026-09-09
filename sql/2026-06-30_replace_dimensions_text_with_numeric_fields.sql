begin;

alter table public."RESULTS"
  add column if not exists largo_mm real,
  add column if not exists ancho_mm real,
  add column if not exists espesor_mm real;

comment on column public."RESULTS".largo_mm is
'Largo de la probeta en milimetros.';

comment on column public."RESULTS".ancho_mm is
'Ancho de la probeta en milimetros.';

comment on column public."RESULTS".espesor_mm is
'Espesor geometrico de la probeta en milimetros.';

alter table public."RESULTS"
  drop column if exists dimensions;

commit;

begin;

alter table public."CAPA"
add column if not exists espesor double precision;

comment on column public."CAPA".espesor is
'Espesor individual de cada capa para calcular el promedio de la probeta.';

commit;

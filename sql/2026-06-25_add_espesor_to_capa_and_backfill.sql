begin;

alter table public."CAPA"
add column if not exists espesor double precision;

comment on column public."CAPA".espesor is
'Espesor individual de cada capa para calcular el promedio de la probeta.';

update public."CAPA" c
set espesor = m.espesor_no_compact
from public."PRE-IMPREGNADO" m
where c.pre_impregnado_id = m.id
  and c.espesor is null;

commit;

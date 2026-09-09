begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'RESULTS'
      and column_name = 'weight'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'RESULTS'
      and column_name = 'weight_g'
  ) then
    alter table public."RESULTS"
      rename column weight to weight_g;
  end if;
end $$;

comment on column public."RESULTS".weight_g is
'Peso de la probeta en gramos.';

comment on column public."RESULTS".density is
'Densidad calculada automaticamente en g/mm^3.';

update public."RESULTS"
set weight_g = weight_g * 1000
where weight_g is not null;

update public."RESULTS"
set density =
  case
    when weight_g is null
      or largo_mm is null
      or ancho_mm is null
      or espesor_mm is null
      or largo_mm <= 0
      or ancho_mm <= 0
      or espesor_mm <= 0
    then null
    else round((weight_g / (largo_mm * ancho_mm * espesor_mm))::numeric, 6)::real
  end;

commit;

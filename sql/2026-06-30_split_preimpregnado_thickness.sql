begin;

alter table public."PRE-IMPREGNADO"
  add column if not exists espesor_curado double precision,
  add column if not exists espesor_sin_curar double precision;

comment on column public."PRE-IMPREGNADO".espesor_curado is
'Espesor del preimpregnado en estado curado.';

comment on column public."PRE-IMPREGNADO".espesor_sin_curar is
'Espesor del preimpregnado en estado sin curar.';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'PRE-IMPREGNADO'
      and column_name = 'espesor_no_compact'
  ) then
    update public."PRE-IMPREGNADO"
    set
      espesor_curado = coalesce(espesor_curado, espesor_no_compact),
      espesor_sin_curar = coalesce(espesor_sin_curar, espesor_no_compact);
  end if;
end $$;

alter table public."PRE-IMPREGNADO"
  drop column if exists espesor_no_compact;

commit;

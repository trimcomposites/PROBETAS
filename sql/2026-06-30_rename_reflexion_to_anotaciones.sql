begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'RESULTS'
      and column_name = 'reflexion'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'RESULTS'
      and column_name = 'anotaciones'
  ) then
    alter table public."RESULTS"
      rename column reflexion to anotaciones;
  end if;
end $$;

alter table public."RESULTS"
  alter column anotaciones type text
  using anotaciones::text;

comment on column public."RESULTS".anotaciones is
'Anotaciones libres sobre la probeta.';

commit;

begin;

alter table public."RESULTS"
  add column if not exists has_acabado_cara_b boolean not null default false,
  add column if not exists acabado_cara_b_id bigint;

comment on column public."RESULTS".has_acabado_cara_b is
'Indica si la probeta tiene un segundo acabado asociado a la cara B.';

comment on column public."RESULTS".acabado_cara_b_id is
'Acabado asociado a la cara B de la probeta.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'results_acabado_cara_b_id_fkey'
  ) then
    alter table public."RESULTS"
      add constraint results_acabado_cara_b_id_fkey
      foreign key (acabado_cara_b_id) references public."ACABADO"(id);
  end if;
end $$;

commit;

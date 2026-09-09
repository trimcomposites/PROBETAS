begin;

create table if not exists public."DIRECCION_CAPA" (
  id bigint primary key,
  created_at timestamptz not null default now(),
  alias text not null unique
);

comment on table public."DIRECCION_CAPA" is
'Catalogo de direcciones permitidas para las capas.';

comment on column public."DIRECCION_CAPA".alias is
'Etiqueta visible de la direccion de laminado.';

insert into public."DIRECCION_CAPA" (id, alias)
values
  (1, '0/90°'),
  (2, '0°'),
  (3, '90°'),
  (4, '45°'),
  (5, '-45/+45°'),
  (6, '-45°'),
  (7, '+45°')
on conflict (id) do update
set alias = excluded.alias;

alter table public."CAPA"
add column if not exists direccion_id bigint;

comment on column public."CAPA".direccion_id is
'Referencia a la direccion normalizada de la capa.';

with normalized_options as (
  select
    id,
    replace(replace(trim(alias), ' ', ''), 'º', '°') as normalized_alias
  from public."DIRECCION_CAPA"
),
normalized_layers as (
  select
    c.id,
    replace(replace(trim(c.direccion), ' ', ''), 'º', '°') as normalized_direccion
  from public."CAPA" c
  where c.direccion is not null
    and trim(c.direccion) <> ''
)
update public."CAPA" c
set direccion_id = o.id
from normalized_layers l
join normalized_options o
  on o.normalized_alias = l.normalized_direccion
where c.id = l.id
  and c.direccion_id is null;

do $$
begin
  if exists (
    select 1
    from public."CAPA" c
    where c.direccion_id is null
      and c.direccion is not null
      and trim(c.direccion) <> ''
  ) then
    raise exception
      'Hay valores de CAPA.direccion sin correspondencia en DIRECCION_CAPA. Revisa esos datos antes de continuar.';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'capa_direccion_id_fkey'
  ) then
    alter table public."CAPA"
      add constraint capa_direccion_id_fkey
      foreign key (direccion_id) references public."DIRECCION_CAPA"(id);
  end if;
end $$;

alter table public."CAPA"
alter column direccion_id set not null;

alter table public."CAPA"
drop column if exists direccion;

commit;

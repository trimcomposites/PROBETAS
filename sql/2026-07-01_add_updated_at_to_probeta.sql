begin;

alter table public."PROBETA"
  add column if not exists updated_at timestamptz;

update public."PROBETA"
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

commit;

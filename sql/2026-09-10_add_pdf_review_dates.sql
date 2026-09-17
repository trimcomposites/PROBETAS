begin;

alter table public."FIBRAS_REFUERZO"
  add column if not exists fecha_revision_mds date;

alter table public."PRE-IMPREGNADO"
  add column if not exists fecha_revision_mds date,
  add column if not exists fecha_revision_msdt date;

alter table public."RESINA_SYSTEM"
  add column if not exists fecha_revision_mds date,
  add column if not exists fecha_revision_msdt date;

commit;

begin;

do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'CAPA',
    'capa',
    'PROBETA_CAPA',
    'probeta_capa',
    'PROBETA_PRE-IMPREGNADO',
    'PROBETA_PRE_IMPREGNADO',
    'probeta_pre_impregnado'
  ]
  loop
    if to_regclass(format('public.%I', relation_name)) is null then
      continue;
    end if;

    execute format(
      'drop policy if exists %I on public.%I',
      relation_name || '_delete_role_based',
      relation_name
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.current_user_is_approved() = true and public.current_user_role() in (''editor'', ''gestor'', ''admin''))',
      relation_name || '_delete_role_based',
      relation_name
    );
  end loop;
end;
$$;

commit;

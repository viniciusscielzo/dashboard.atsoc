-- Permite persistir a configuração do pipeline e os leads em instalações
-- que já executaram a migração de autenticação anterior.
create or replace function public.update_workspace_resource(
  target_org uuid,
  resource_name text,
  resource_value jsonb
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_revision bigint;
begin
  if resource_name not in (
    'parameters','financialEntries','recurringRules','teamMembers',
    'clientRecords','quoteRecords','scenarioRecords','crmLeads','crmColumns','companyLogo',
    'initialBalance','approvalRequests','discountAudit'
  ) then
    raise exception 'Recurso não permitido';
  end if;

  update public.workspace_states
     set data = jsonb_set(data, array[resource_name], resource_value, true),
         revision = revision + 1,
         updated_by = auth.uid(),
         updated_at = now()
   where organization_id = target_org
  returning revision into next_revision;

  if next_revision is null then raise exception 'Workspace não encontrado'; end if;

  insert into public.audit_log (
    organization_id, actor_user_id, action, entity_type, entity_id, safe_metadata
  ) values (
    target_org, auth.uid(), 'update', 'workspace_resource', resource_name,
    jsonb_build_object('resource', resource_name, 'revision', next_revision)
  );

  return next_revision;
end;
$$;

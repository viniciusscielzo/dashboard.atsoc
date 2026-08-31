-- Execute after 0001_atsoc_core.sql.
-- The workspace table is the secure persistence bridge for the current UI.
-- Normalized core tables remain available for the next repository migration.

drop policy if exists organizations_create_self on public.organizations;

create or replace function public.protect_owner_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.role = 'owner' and exists (
    select 1 from public.organizations
    where id = new.organization_id
      and owner_user_id = new.user_id
      and (auth.uid() is null or owner_user_id = auth.uid())
  ) then
    return new;
  end if;
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and (old.role = 'owner' or new.role = 'owner'))
     or (tg_op = 'INSERT' and new.role = 'owner') then
    if not public.has_org_role(coalesce(new.organization_id, old.organization_id), array['owner']) then
      raise exception 'Somente o proprietário pode alterar a função owner';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create table if not exists public.workspace_states (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_by uuid not null default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(data) = 'object')
);

alter table public.workspace_states enable row level security;

create policy workspace_partner_read on public.workspace_states for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin','partner']));

create policy workspace_partner_insert on public.workspace_states for insert to authenticated
with check (
  public.has_org_role(organization_id, array['owner','admin','partner'])
  and updated_by = auth.uid()
);

create policy workspace_partner_update on public.workspace_states for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin','partner']))
with check (
  public.has_org_role(organization_id, array['owner','admin','partner'])
  and updated_by = auth.uid()
);

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
    'clientRecords','quoteRecords','scenarioRecords','companyLogo',
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
    jsonb_build_object('revision', next_revision)
  );
  return next_revision;
end;
$$;

revoke all on function public.update_workspace_resource(uuid, text, jsonb) from public;
grant execute on function public.update_workspace_resource(uuid, text, jsonb) to authenticated;

-- Insert-only audit policy is intentionally limited to authenticated organization members.
create policy audit_member_insert on public.audit_log for insert to authenticated
with check (actor_user_id = auth.uid() and public.is_org_member(organization_id));

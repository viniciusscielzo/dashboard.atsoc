create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  owner_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','partner','finance','seller','collaborator')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(target_org uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, text[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

create or replace function public.bootstrap_organization_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner');
  return new;
end;
$$;

create trigger organizations_bootstrap_owner
after insert on public.organizations
for each row execute function public.bootstrap_organization_owner();

create or replace function public.protect_owner_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.role = 'owner' and exists (
    select 1 from public.organizations
    where id = new.organization_id
      and owner_user_id = new.user_id
      and owner_user_id = auth.uid()
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

create trigger organization_members_protect_owner
before insert or update or delete on public.organization_members
for each row execute function public.protect_owner_membership();

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  due_date date not null,
  description text not null,
  party text not null default '',
  category text not null,
  amount numeric(14,2) not null check (amount >= 0),
  entry_type text not null check (entry_type in ('income','expense')),
  status text not null check (status in ('forecast','received','paid','overdue','cancelled')),
  paid_at date,
  recurring_rule_id uuid,
  manual_override boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index financial_entries_org_date_idx on public.financial_entries (organization_id, due_date);

create table public.recurring_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  description text not null,
  party text not null default '',
  category text not null,
  amount numeric(14,2) not null check (amount >= 0),
  entry_type text not null check (entry_type in ('income','expense')),
  due_day smallint not null check (due_day between 1 and 28),
  starts_on date not null,
  ends_on date,
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fantasy_name text not null,
  legal_name text,
  cnpj text,
  responsible_name text,
  phone text,
  email text,
  active_clients integer not null default 0 check (active_clients >= 0),
  monthly_revenue numeric(14,2) not null default 0 check (monthly_revenue >= 0),
  intensity_factor numeric(8,4) not null default 1 check (intensity_factor > 0),
  billing_day smallint not null default 10 check (billing_day between 1 and 28),
  contract_start date,
  status text not null default 'active' check (status in ('active','inactive','follow_up')),
  channels text,
  support_level text,
  seller_id uuid references auth.users(id),
  schedule jsonb not null default '[]'::jsonb,
  inactive_reason text,
  follow_up_date date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_org_status_idx on public.clients (organization_id, status);

create table public.contract_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  adjustment_type text not null check (adjustment_type in ('upgrade','downgrade','reajuste')),
  effective_date date not null,
  previous_revenue numeric(14,2) not null,
  new_revenue numeric(14,2) not null,
  previous_active_clients integer not null,
  new_active_clients integer not null,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  role_name text not null,
  member_type text not null check (member_type in ('partner','collaborator')),
  monthly_cost numeric(14,2) not null default 0,
  productive_hours numeric(10,2) not null default 0,
  operational boolean not null default false,
  shift_pattern text not null check (shift_pattern in ('4x2','6x1','5x2','12x36','2x2')),
  shift_start time not null,
  shift_end time not null,
  cycle_start date not null,
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_name text not null,
  seller_id uuid not null default auth.uid() references auth.users(id),
  quote_payload jsonb not null,
  minimum_price numeric(14,2) not null,
  target_price numeric(14,2) not null,
  excellent_price numeric(14,2) not null,
  negotiated_price numeric(14,2) not null,
  final_margin numeric(8,4) not null,
  expected_profit numeric(14,2) not null,
  status text not null check (status in ('draft','closed_call','follow_up','rejected','approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotes_org_created_idx on public.quotes (organization_id, created_at desc);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  scenario_type text not null,
  input_payload jsonb not null,
  result_payload jsonb not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  parameters jsonb not null default '{}'::jsonb,
  logo_path text,
  currency text not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  updated_by uuid not null default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_org_created_idx on public.audit_log (organization_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.financial_entries enable row level security;
alter table public.recurring_accounts enable row level security;
alter table public.clients enable row level security;
alter table public.contract_adjustments enable row level security;
alter table public.team_members enable row level security;
alter table public.quotes enable row level security;
alter table public.scenarios enable row level security;
alter table public.organization_settings enable row level security;
alter table public.audit_log enable row level security;

create policy organizations_create_self on public.organizations for insert to authenticated
with check (owner_user_id = auth.uid());
create policy organizations_member_read on public.organizations for select to authenticated
using (public.is_org_member(id));
create policy organizations_admin_update on public.organizations for update to authenticated
using (public.has_org_role(id, array['owner','admin']))
with check (public.has_org_role(id, array['owner','admin']));

create policy members_read on public.organization_members for select to authenticated
using (public.is_org_member(organization_id));
create policy members_admin_manage on public.organization_members for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin']))
with check (public.has_org_role(organization_id, array['owner','admin']));

create policy financial_read on public.financial_entries for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin','partner','finance']));
create policy financial_write on public.financial_entries for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','partner','finance']))
with check (public.has_org_role(organization_id, array['owner','admin','partner','finance']));

create policy recurring_read on public.recurring_accounts for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin','partner','finance']));
create policy recurring_write on public.recurring_accounts for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','partner','finance']))
with check (public.has_org_role(organization_id, array['owner','admin','partner','finance']));

create policy clients_read on public.clients for select to authenticated
using (public.is_org_member(organization_id));
create policy clients_sales_write on public.clients for insert to authenticated
with check (public.has_org_role(organization_id, array['owner','admin','partner','seller']));
create policy clients_sales_update on public.clients for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin','partner','seller']))
with check (public.has_org_role(organization_id, array['owner','admin','partner','seller']));
create policy clients_admin_delete on public.clients for delete to authenticated
using (public.has_org_role(organization_id, array['owner','admin','partner']));

create policy adjustments_read on public.contract_adjustments for select to authenticated
using (public.is_org_member(organization_id));
create policy adjustments_write on public.contract_adjustments for insert to authenticated
with check (public.has_org_role(organization_id, array['owner','admin','partner','seller']));

create policy team_read on public.team_members for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin','partner','finance']));
create policy team_admin_write on public.team_members for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','partner']))
with check (public.has_org_role(organization_id, array['owner','admin','partner']));

create policy quotes_read on public.quotes for select to authenticated
using (
  seller_id = auth.uid()
  or public.has_org_role(organization_id, array['owner','admin','partner'])
);
create policy quotes_sales_insert on public.quotes for insert to authenticated
with check (public.has_org_role(organization_id, array['owner','admin','partner','seller']));
create policy quotes_owner_update on public.quotes for update to authenticated
using (seller_id = auth.uid() or public.has_org_role(organization_id, array['owner','admin','partner']))
with check (seller_id = auth.uid() or public.has_org_role(organization_id, array['owner','admin','partner']));

create policy scenarios_read on public.scenarios for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin','partner','finance']));
create policy scenarios_write on public.scenarios for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin','partner','finance']))
with check (public.has_org_role(organization_id, array['owner','admin','partner','finance']));

create policy settings_read on public.organization_settings for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin','partner','finance']));
create policy settings_admin_write on public.organization_settings for all to authenticated
using (public.has_org_role(organization_id, array['owner','admin']))
with check (public.has_org_role(organization_id, array['owner','admin']));

create policy audit_admin_read on public.audit_log for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin']));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-assets', 'company-assets', false, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152,
allowed_mime_types = array['image/png','image/jpeg','image/webp'];

create policy company_assets_read on storage.objects for select to authenticated
using (
  bucket_id = 'company-assets'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);
create policy company_assets_admin_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'company-assets'
  and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner','admin'])
);
create policy company_assets_admin_update on storage.objects for update to authenticated
using (
  bucket_id = 'company-assets'
  and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner','admin'])
)
with check (
  bucket_id = 'company-assets'
  and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner','admin'])
);
create policy company_assets_admin_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'company-assets'
  and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner','admin'])
);

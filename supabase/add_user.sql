-- Create the user first in Authentication > Users.
-- Replace both placeholders, then run once per user.
-- Allowed roles: owner, admin, partner, finance, seller, collaborator.

insert into public.organization_members (organization_id, user_id, role)
select id, 'YOUR_AUTH_USER_UUID'::uuid, 'partner'
from public.organizations
where name = 'ATSOC'
on conflict (organization_id, user_id)
do update set role = excluded.role;

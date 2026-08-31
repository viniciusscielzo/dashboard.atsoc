-- 1) Create the first user in Supabase Authentication > Users.
-- 2) Replace YOUR_AUTH_USER_UUID below with that user's UUID.
-- 3) Run this script once in SQL Editor.

do $$
declare
  first_user uuid := 'YOUR_AUTH_USER_UUID'::uuid;
begin
  if not exists (select 1 from auth.users where id = first_user) then
    raise exception 'Usuário não encontrado em auth.users';
  end if;
  if exists (select 1 from public.organizations) then
    raise exception 'Já existe uma organização. Não execute o seed novamente.';
  end if;
  insert into public.organizations (name, owner_user_id)
  values ('ATSOC', first_user);
end $$;

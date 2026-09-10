-- First create and confirm your admin user in Supabase Authentication → Users.
-- Replace the email below with YOUR email, then run this query in SQL Editor.
insert into public.store_admins(user_id)
select id from auth.users
where lower(email)=lower('YOUR-ADMIN-EMAIL@example.com')
  and email_confirmed_at is not null
on conflict do nothing;

-- This should return one row. If it returns zero, check the email and confirmation.
select u.email,a.created_at
from public.store_admins a join auth.users u on u.id=a.user_id
where lower(u.email)=lower('YOUR-ADMIN-EMAIL@example.com');

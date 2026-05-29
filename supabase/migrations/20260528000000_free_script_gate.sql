-- Free-script gate: profiles table + auto-provisioning trigger
-- Tracks free-script usage per user and a paid flag for future paid accounts.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  free_scripts_used integer not null default 0,
  is_paid boolean not null default false,
  signup_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Anti-abuse lookups (block reuse by same IP / email across accounts)
create index if not exists profiles_signup_ip_idx on public.profiles (signup_ip);
create index if not exists profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

-- Users may read ONLY their own profile (powers the UI progress bar).
-- free_scripts_used / is_paid are never writable from the client; they are
-- mutated exclusively by the script-write edge function via the service role,
-- so the 1-free-script limit cannot be bypassed from the frontend.
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up (Google OAuth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomic consume: increments free_scripts_used at most to 1 for free users.
-- Returns true if a free script was actually consumed by this call.
-- SECURITY DEFINER + locked search_path so only this function can mutate the count.
create or replace function public.consume_free_script(p_user_id uuid, p_ip text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer := 0;
begin
  update public.profiles
     set free_scripts_used = free_scripts_used + 1,
         signup_ip = coalesce(signup_ip, p_ip),
         updated_at = now()
   where id = p_user_id
     and is_paid = false
     and free_scripts_used < 1;

  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

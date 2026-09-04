create table if not exists public.tethers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  tags text[],
  outline_color text,
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tethers add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
alter table public.tethers add column if not exists outline_color text;

create or replace function public.set_tether_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_tethers_updated_at'
      and tgrelid = 'public.tethers'::regclass
  ) then
    create trigger set_tethers_updated_at
    before update on public.tethers
    for each row execute function public.set_tether_updated_at();
  end if;
end;
$$;

create table if not exists public.tether_pulls (
  id uuid default gen_random_uuid() primary key,
  tether_id uuid references public.tethers(id) on delete cascade not null,
  pulled_by uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (tether_id, pulled_by)
);

create table if not exists public.tether_sms_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  phone_number text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.tether_tag_settings (
  user_id uuid references auth.users(id) on delete cascade not null,
  tag text not null,
  color text not null,
  primary key (user_id, tag)
);

alter table public.tethers enable row level security;
alter table public.tether_pulls enable row level security;
alter table public.tether_sms_settings enable row level security;
alter table public.tether_tag_settings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tethers' and policyname = 'Public tethers are viewable') then
    create policy "Public tethers are viewable" on public.tethers for select using (is_public = true or (select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tethers' and policyname = 'Users can create their own tethers') then
    create policy "Users can create their own tethers" on public.tethers for insert with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tethers' and policyname = 'Users can update their own tethers') then
    create policy "Users can update their own tethers" on public.tethers for update using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tether_pulls' and policyname = 'Users can pull tethers') then
    create policy "Users can pull tethers" on public.tether_pulls for insert with check ((select auth.uid()) = pulled_by);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tether_pulls' and policyname = 'Pull counts are viewable') then
    create policy "Pull counts are viewable" on public.tether_pulls for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tether_sms_settings' and policyname = 'Users can view their SMS settings') then
    create policy "Users can view their SMS settings" on public.tether_sms_settings for select using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tether_sms_settings' and policyname = 'Users can manage their SMS settings') then
    create policy "Users can manage their SMS settings" on public.tether_sms_settings for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tether_tag_settings' and policyname = 'Users can manage their tag settings') then
    create policy "Users can manage their tag settings" on public.tether_tag_settings for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
end;
$$;

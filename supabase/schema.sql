create table public.tethers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  tags text[],
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.tether_pulls (
  id uuid default gen_random_uuid() primary key,
  tether_id uuid references public.tethers(id) on delete cascade not null,
  pulled_by uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (tether_id, pulled_by)
);

alter table public.tethers enable row level security;
alter table public.tether_pulls enable row level security;

create policy "Public tethers are viewable"
  on public.tethers for select using (is_public = true or (select auth.uid()) = user_id);
create policy "Users can create their own tethers"
  on public.tethers for insert with check ((select auth.uid()) = user_id);
create policy "Users can update their own tethers"
  on public.tethers for update using ((select auth.uid()) = user_id);
create policy "Users can pull tethers"
  on public.tether_pulls for insert with check ((select auth.uid()) = pulled_by);
create policy "Pull counts are viewable"
  on public.tether_pulls for select using (true);

create table public.tethers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  tags text[],
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tethers add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

create or replace function public.set_tether_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_tethers_updated_at on public.tethers;
create trigger set_tethers_updated_at
before update on public.tethers
for each row execute function public.set_tether_updated_at();

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

-- Capy Prayer — GDD §12.3. All kid data hangs off the parent's auth user; RLS by parent_id = auth.uid().
-- No PII of the kid beyond nickname + age band (COPPA, GDD §11).

create extension if not exists "pgcrypto";

create table public.parents (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  tradition text not null default 'christian' check (tradition in ('christian','catholic-addon','jewish','muslim','secular')),
  bedtime_hour smallint not null default 19 check (bedtime_hour between 17 and 22),
  tz text not null default 'America/New_York',
  rc_customer_id text unique,
  created_at timestamptz not null default now()
);

create table public.kid_profiles (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  age_band text not null default '4-8' check (age_band in ('4-8','9-11')),
  skin_id text not null default 'capy-default',
  pond_biome text not null default 'meadow',
  created_at timestamptz not null default now()
);
create index on public.kid_profiles (parent_id);

create table public.progress (
  kid_id uuid not null references public.kid_profiles (id) on delete cascade,
  pack_id text not null,
  lesson_id text not null,
  status text not null default 'started' check (status in ('started','completed')),
  score smallint,
  completed_at timestamptz,
  primary key (kid_id, pack_id, lesson_id)
);

create table public.streaks (
  kid_id uuid primary key references public.kid_profiles (id) on delete cascade,
  current int not null default 0,
  best int not null default 0,
  last_active_date date,
  grace_used_week smallint not null default 0,
  week_start date
);

create table public.prayer_people (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.kid_profiles (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 30),
  icon text not null default 'person',
  prayed_count int not null default 0,
  note_from_parent text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.prayer_people (kid_id);

create table public.pond (
  kid_id uuid primary key references public.kid_profiles (id) on delete cascade,
  lanterns_total int not null default 0,
  beacons int not null default 0,
  unlocked jsonb not null default '[]'::jsonb
);

create table public.entitlements (
  parent_id uuid not null references public.parents (id) on delete cascade,
  product_id text not null,
  is_active boolean not null default false,
  expires_at timestamptz,
  source text not null default 'revenuecat',
  updated_at timestamptz not null default now(),
  primary key (parent_id, product_id)
);

-- first-party analytics (GDD §11: no third-party SDKs)
create table public.events (
  id bigint generated always as identity primary key,
  kid_id uuid references public.kid_profiles (id) on delete set null,
  parent_id uuid not null references public.parents (id) on delete cascade,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  ts timestamptz not null default now()
);
create index on public.events (parent_id, ts desc);
create index on public.events (name, ts desc);

create table public.content_packs (
  id text not null,
  version text not null,
  url text not null,
  sha256 text not null,
  min_app_version text not null default '1.0.0',
  active boolean not null default false,
  rollout_pct smallint not null default 100 check (rollout_pct between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (id, version)
);

-- helper: does this row's kid belong to the caller?
create or replace function public.is_my_kid(kid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.kid_profiles k where k.id = kid and k.parent_id = auth.uid());
$$;

alter table public.parents enable row level security;
alter table public.kid_profiles enable row level security;
alter table public.progress enable row level security;
alter table public.streaks enable row level security;
alter table public.prayer_people enable row level security;
alter table public.pond enable row level security;
alter table public.entitlements enable row level security;
alter table public.events enable row level security;
alter table public.content_packs enable row level security;

create policy "parent owns row" on public.parents for all using (id = auth.uid()) with check (id = auth.uid());
create policy "parent owns kids" on public.kid_profiles for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());
create policy "parent owns progress" on public.progress for all using (public.is_my_kid(kid_id)) with check (public.is_my_kid(kid_id));
create policy "parent owns streaks" on public.streaks for all using (public.is_my_kid(kid_id)) with check (public.is_my_kid(kid_id));
create policy "parent owns people" on public.prayer_people for all using (public.is_my_kid(kid_id)) with check (public.is_my_kid(kid_id));
create policy "parent owns pond" on public.pond for all using (public.is_my_kid(kid_id)) with check (public.is_my_kid(kid_id));
create policy "parent reads entitlements" on public.entitlements for select using (parent_id = auth.uid());
create policy "parent writes own events" on public.events for insert with check (parent_id = auth.uid());
create policy "parent reads own events" on public.events for select using (parent_id = auth.uid());
create policy "packs are public" on public.content_packs for select using (active);

-- auto-create parent row on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.parents (id, email) values (new.id, coalesce(new.email, ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- "delete my kid's data in 1 tap" (Parent Corner): cascade does it; expose an RPC for the client
create or replace function public.delete_kid(kid uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.kid_profiles where id = kid and parent_id = auth.uid();
$$;

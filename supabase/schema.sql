-- Health Tracker Supabase Schema (v2)
-- Run this in the Supabase SQL Editor for a fresh setup

-- User profile (stores height for BMI calculation, etc.)
create table user_profile (
  user_id uuid primary key references auth.users(id),
  height_inches numeric not null default 65,
  created_at timestamptz default now()
);

-- Medication types lookup (shared)
create table medication_types (
  id bigint generated always as identity primary key,
  name text not null unique
);

insert into medication_types (name) values ('capsule'), ('tablet'), ('inhaler');

-- Exercise types lookup (shared)
create table exercise_types (
  id bigint generated always as identity primary key,
  name text not null,
  default_unit text not null default 'reps',
  user_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now(),
  unique(name, user_id)
);

-- Active ingredients catalog (shared, controlled list)
create table active_ingredients (
  id bigint generated always as identity primary key,
  ingredient_name text not null,
  dose numeric not null,
  dose_unit text not null default 'mg',
  user_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now(),
  unique(ingredient_name, dose, dose_unit, user_id)
);

-- Medications catalog (shared)
create table medications (
  id bigint generated always as identity primary key,
  brand_name text not null,
  type_id bigint references medication_types(id),
  user_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

-- Junction: which active ingredients make up each medication
create table medication_ingredients (
  id bigint generated always as identity primary key,
  medication_id bigint not null references medications(id) on delete cascade,
  ingredient_id bigint not null references active_ingredients(id),
  unique(medication_id, ingredient_id)
);

-- Weight log
create table weight_log (
  id uuid default gen_random_uuid() primary key,
  recorded_at timestamptz not null default now(),
  weight_lbs numeric not null,
  user_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

-- Exercise log (sets * reps = total, no ambiguous "amount" column)
create table exercise_log (
  id uuid default gen_random_uuid() primary key,
  recorded_at timestamptz not null default now(),
  exercise_type_id bigint references exercise_types(id),
  sets integer not null default 1,
  reps integer not null,
  unit text not null default 'reps',
  user_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

-- Medicine log (quantity = number of pills/units taken)
create table medicine_log (
  id uuid default gen_random_uuid() primary key,
  recorded_at timestamptz not null default now(),
  medication_id bigint references medications(id),
  quantity numeric not null default 1,
  user_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

-- Sleep log
create table sleep_log (
  id uuid default gen_random_uuid() primary key,
  bedtime timestamptz not null,
  wake_time timestamptz not null,
  quality integer check (quality between 1 and 5),
  user_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

-- Indexes
create index idx_active_ingredients_user on active_ingredients(user_id);
create index idx_med_ingredients_med_id on medication_ingredients(medication_id);
create index idx_med_ingredients_ingredient_id on medication_ingredients(ingredient_id);
create index idx_weight_log_user_date on weight_log(user_id, recorded_at desc);
create index idx_exercise_log_user_date on exercise_log(user_id, recorded_at desc);
create index idx_medicine_log_user_date on medicine_log(user_id, recorded_at desc);
create index idx_sleep_log_user_date on sleep_log(user_id, bedtime desc);

-- Row Level Security (log tables only — everything else is shared)
alter table weight_log enable row level security;
alter table exercise_log enable row level security;
alter table medicine_log enable row level security;
alter table sleep_log enable row level security;

create policy "Own weight_log" on weight_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Own exercise_log" on exercise_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Own medicine_log" on medicine_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Own sleep_log" on sleep_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

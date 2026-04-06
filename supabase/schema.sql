-- Health Tracker Supabase Schema (v2)
-- Run this in the Supabase SQL Editor for a fresh setup

-- User profile (stores height for BMI calculation, etc.)
create table health_user_profile (
  user_id uuid primary key references auth.users(id),
  height_inches numeric not null default 65,
  created_at timestamptz default now()
);

-- Medication types lookup (shared)
create table health_medication_types (
  id bigint generated always as identity primary key,
  name text not null unique
);

insert into health_medication_types (name) values ('capsule'), ('tablet'), ('inhaler');

-- Active ingredients catalog (shared, controlled list)
create table health_active_ingredients (
  id bigint generated always as identity primary key,
  ingredient_name text not null,
  dose numeric not null,
  dose_unit text not null default 'mg',
  user_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now(),
  unique(ingredient_name, dose, dose_unit, user_id)
);

-- Medications catalog (shared)
create table health_medications (
  id bigint generated always as identity primary key,
  brand_name text not null,
  type_id bigint references health_medication_types(id),
  user_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

-- Junction: which active ingredients make up each medication
create table health_medication_ingredients (
  id bigint generated always as identity primary key,
  medication_id bigint not null references health_medications(id) on delete cascade,
  ingredient_id bigint not null references health_active_ingredients(id),
  unique(medication_id, ingredient_id)
);

-- Weight log
create table health_weight_log (
  id uuid default gen_random_uuid() primary key,
  recorded_at timestamptz not null default now(),
  weight_lbs numeric not null,
  user_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

-- Medicine log (quantity = number of pills/units taken)
create table health_medicine_log (
  id uuid default gen_random_uuid() primary key,
  recorded_at timestamptz not null default now(),
  medication_id bigint references health_medications(id),
  quantity numeric not null default 1,
  user_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

-- Indexes
create index idx_health_active_ingredients_user on health_active_ingredients(user_id);
create index idx_health_med_ingredients_med_id on health_medication_ingredients(medication_id);
create index idx_health_med_ingredients_ingredient_id on health_medication_ingredients(ingredient_id);
create index idx_health_weight_log_user_date on health_weight_log(user_id, recorded_at desc);
create index idx_health_medicine_log_user_date on health_medicine_log(user_id, recorded_at desc);
-- Row Level Security
alter table health_user_profile enable row level security;
alter table health_active_ingredients enable row level security;
alter table health_medications enable row level security;
alter table health_weight_log enable row level security;
alter table health_medicine_log enable row level security;

create policy "Own health_user_profile" on health_user_profile for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Own health_active_ingredients" on health_active_ingredients for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Own health_medications" on health_medications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Own health_weight_log" on health_weight_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Own health_medicine_log" on health_medicine_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

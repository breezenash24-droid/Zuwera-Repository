-- ─────────────────────────────────────────────────────────────
-- ZUWERA — Supabase Schema
-- ─────────────────────────────────────────────────────────────
-- Run this entire file in:
-- Supabase Dashboard → SQL Editor → New query → paste → Run
-- ─────────────────────────────────────────────────────────────

-- Enable UUID extension (usually already on)
create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────────
-- One row per user. Stores saved shipping address + email.
create table if not exists profiles (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid unique references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  addr_line1  text default '',
  addr_line2  text default '',
  addr_city   text default '',
  addr_state  text default '',
  addr_zip    text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create profile row when user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Favorites ─────────────────────────────────────────────────
-- Products a logged-in customer has saved to their favorites.
create table if not exists favorites (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade,
  product_id   text not null,
  product_name text,
  price        numeric(10,2),
  image_url    text default '',
  created_at   timestamptz default now(),
  unique(user_id, product_id)
);

-- ── Orders ────────────────────────────────────────────────────
-- One row per completed Stripe payment.
create table if not exists orders (
  id                        uuid primary key default uuid_generate_v4(),
  stripe_payment_intent_id  text unique,
  user_id                   uuid references auth.users(id) on delete set null,
  email                     text,
  customer_name             text,
  items                     jsonb default '[]',
  subtotal_cents            integer default 0,
  shipping_cents            integer default 0,
  tax_cents                 integer default 0,
  total_cents               integer default 0,
  shipping_address          jsonb default '{}',
  shipping_provider         text default '',
  shipping_service          text default '',
  tracking_number           text default '',
  tracking_url              text default '',
  label_url                 text default '',
  status                    text default 'confirmed',
  created_at                timestamptz default now()
);

-- ── Row Level Security ─────────────────────────────────────────
-- Users can only read/write their own data.

alter table profiles  enable row level security;
alter table favorites enable row level security;
alter table orders    enable row level security;

-- Profiles: users can read + update their own row
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = user_id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = user_id);

-- Favorites: users can manage their own favorites
create policy "Users can view own favorites"
  on favorites for select using (auth.uid() = user_id);

create policy "Users can add favorites"
  on favorites for insert with check (auth.uid() = user_id);

create policy "Users can remove favorites"
  on favorites for delete using (auth.uid() = user_id);

-- Orders: users can view their own orders
-- (service role bypasses RLS for inserts from webhook)
create policy "Users can view own orders"
  on orders for select using (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_profiles_user_id  on profiles(user_id);
create index if not exists idx_profiles_email    on profiles(email);
create index if not exists idx_favorites_user_id on favorites(user_id);
create index if not exists idx_orders_user_id    on orders(user_id);
create index if not exists idx_orders_email      on orders(email);
create index if not exists idx_orders_stripe_id  on orders(stripe_payment_intent_id);

-- ─────────────────────────────────────────────────────────────
-- Done! Your database is ready.
-- ─────────────────────────────────────────────────────────────


-- ── Waitlist (Drop 001 notify signups) ──────────────────────
CREATE TABLE IF NOT EXISTS public.waitlist (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT    NOT NULL UNIQUE,
  source      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public notify form)
CREATE POLICY "waitlist_insert_all" ON public.waitlist
  FOR INSERT WITH CHECK (true);

-- Only service role can read
CREATE POLICY "waitlist_select_service" ON public.waitlist
  FOR SELECT USING (false);

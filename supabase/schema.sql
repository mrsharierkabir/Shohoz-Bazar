-- ============================================================
-- SHOHAZ BAZAR — Supabase schema
-- Run this whole file once in the Supabase SQL editor
-- (Project ivpiwardlmjsogogxpjm)
-- ============================================================

-- 1. SITE SETTINGS (hotline / whatsapp / cash on delivery text) --------
create table if not exists public.settings (
  id int primary key default 1,
  hotline text not null default '+8801521719188',
  whatsapp text not null default '+8801521719188',
  cash_on_delivery_text text not null default 'Cash on delivery',
  hours_text text not null default '24 hours open',
  logo_text_1 text not null default 'SHOHAZ',
  logo_text_2 text not null default 'BAZAR',
  logo_icon_url text not null default '',
  footer_about text not null default 'Top Quality Products, Electronics, Dried Fish and essentials - at your doorsteps.',
  footer_copyright text not null default '@2026 shohazbazar- All Rights Reserved | Trade Licence: DEMO NUMBER XXXX XXXX XXXX XXXX XXXX',
  constraint single_row check (id = 1)
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- 2. ROTATING TITLES (top marquee-style announcement, changes every 5s) -
create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- 3. BANNERS (hero carousel, auto-changes every 5s, manual arrows) ------
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  headline text default '',
  subheadline text default '',
  link_url text default '',
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- 4. CATEGORIES ----------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_bn text default '',
  icon_url text default '',
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- 5. PRODUCTS --------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  category_id uuid references public.categories(id) on delete set null,
  images jsonb not null default '[]',        -- array of image urls
  regular_price numeric not null default 0,
  discounted_price numeric not null default 0,
  stock int not null default 0,
  in_stock boolean generated always as (stock > 0) stored,
  description text default '',
  delivery_info text default '',
  featured boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists products_category_idx on public.products(category_id);

-- 6. PRODUCT VARIANTS / OPTIONS (checkboxes e.g. size / type, each w/ photo)
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  option_group text not null default 'Option', -- e.g. "Size", "Type"
  name text not null,                          -- e.g. "128GB", "Red"
  image_url text default '',
  price_override numeric,                      -- optional
  position int not null default 0
);

-- 7. PRODUCT REVIEWS (admin managed) --------------------------------------
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  author text not null default 'Customer',
  rating int not null default 5 check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz default now()
);

-- 8. FOOTER LINKS (Quick Links / Policies, admin adds one after another) -
create table if not exists public.footer_links (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('quick_links','policies')),
  label text not null,
  url text not null default '#',
  position int not null default 0
);

-- 9. ORDERS (created at checkout) -----------------------------------------
create sequence if not exists public.orders_invoice_seq;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  invoice_no text unique,
  customer_name text,
  customer_phone text,
  customer_address text,
  note text default '',
  items jsonb not null default '[]',
  subtotal numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'pending' check (status in ('pending','shipped','delivered','returned','cancelled')),
  is_read boolean not null default false,
  created_at timestamptz default now()
);

create or replace function public.set_order_invoice_no()
returns trigger as $$
begin
  if new.invoice_no is null then
    new.invoice_no := 'SB' || lpad(nextval('public.orders_invoice_seq')::text, 3, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_order_invoice_no on public.orders;
create trigger trg_set_order_invoice_no
  before insert on public.orders
  for each row execute function public.set_order_invoice_no();

-- 10. POLICY PAGES (Terms & Conditions / Privacy Policy / Returns & Refunds) --
-- Terms & Conditions uses title+content as numbered TOC sections.
-- Privacy Policy and Returns & Refunds use title+content as heading+bullets.
create table if not exists public.policy_sections (
  id uuid primary key default gen_random_uuid(),
  page text not null check (page in ('terms','privacy','returns')),
  title text not null,
  content text not null default '',
  position int not null default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Public (anon) can READ everything storefront-related.
-- Only authenticated users (admin) can WRITE.
-- ============================================================
alter table public.settings enable row level security;
alter table public.titles enable row level security;
alter table public.banners enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_reviews enable row level security;
alter table public.footer_links enable row level security;
alter table public.orders enable row level security;
alter table public.policy_sections enable row level security;

-- read policies (public)
create policy "public read settings" on public.settings for select using (true);
create policy "public read titles" on public.titles for select using (true);
create policy "public read banners" on public.banners for select using (true);
create policy "public read categories" on public.categories for select using (true);
create policy "public read products" on public.products for select using (true);
create policy "public read variants" on public.product_variants for select using (true);
create policy "public read reviews" on public.product_reviews for select using (true);
create policy "public read footer_links" on public.footer_links for select using (true);
create policy "public read policy_sections" on public.policy_sections for select using (true);

-- anyone can INSERT an order (checkout, no login needed for customers)
create policy "public insert orders" on public.orders for insert with check (true);

-- admin (any logged-in user) write access
create policy "admin write settings" on public.settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write titles" on public.titles for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write banners" on public.banners for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write categories" on public.categories for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write products" on public.products for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write variants" on public.product_variants for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write reviews" on public.product_reviews for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write footer_links" on public.footer_links for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin read orders" on public.orders for select using (auth.role() = 'authenticated');
create policy "admin write orders" on public.orders for update using (auth.role() = 'authenticated');
create policy "admin write policy_sections" on public.policy_sections for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE (create a public bucket called "media" for product/banner/category images)
-- Run separately if not already created:
-- insert into storage.buckets (id, name, public) values ('media','media', true)
-- on conflict (id) do nothing;
-- ============================================================
insert into storage.buckets (id, name, public) values ('media','media', true) on conflict (id) do nothing;

create policy "public read media" on storage.objects for select using (bucket_id = 'media');
create policy "admin upload media" on storage.objects for insert with check (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "admin update media" on storage.objects for update using (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "admin delete media" on storage.objects for delete using (bucket_id = 'media' and auth.role() = 'authenticated');

-- ============================================================
-- MIGRATIONS — safe to re-run. If you already ran an earlier version
-- of this file, run just this block (from here to the end of the file)
-- to pick up the newest changes without errors about things that
-- already exist.
-- ============================================================
alter table public.settings add column if not exists logo_icon_url text not null default '';
alter table public.orders add column if not exists is_read boolean not null default false;
update public.settings set logo_text_1 = 'SHOHAZ' where logo_text_1 = 'SHOHOZ';

-- Order notes (customer-entered at checkout) + auto-generated invoice numbers
-- like SB001, SB002, ... — safe to re-run.
alter table public.orders add column if not exists note text default '';
alter table public.orders add column if not exists invoice_no text;
create unique index if not exists orders_invoice_no_key on public.orders(invoice_no);
create sequence if not exists public.orders_invoice_seq;

-- Backfill invoice numbers for any orders placed before this update, oldest first.
do $$
declare r record;
begin
  for r in select id from public.orders where invoice_no is null order by created_at asc loop
    update public.orders set invoice_no = 'SB' || lpad(nextval('public.orders_invoice_seq')::text, 3, '0') where id = r.id;
  end loop;
end $$;

create or replace function public.set_order_invoice_no()
returns trigger as $$
begin
  if new.invoice_no is null then
    new.invoice_no := 'SB' || lpad(nextval('public.orders_invoice_seq')::text, 3, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_order_invoice_no on public.orders;
create trigger trg_set_order_invoice_no
  before insert on public.orders
  for each row execute function public.set_order_invoice_no();

-- Simplify order statuses to: pending, shipped, delivered, returned, cancelled.
-- Existing "confirmed" orders move to "pending" so nothing gets lost.
update public.orders set status = 'pending' where status = 'confirmed';
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('pending','shipped','delivered','returned','cancelled'));

create table if not exists public.policy_sections (
  id uuid primary key default gen_random_uuid(),
  page text not null check (page in ('terms','privacy','returns')),
  title text not null,
  content text not null default '',
  position int not null default 0,
  created_at timestamptz default now()
);
alter table public.policy_sections enable row level security;

do $$ begin
  create policy "public read policy_sections" on public.policy_sections for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admin write policy_sections" on public.policy_sections for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

insert into public.footer_links (section, label, url, position)
select * from (values
  ('quick_links','Home','/',0),
  ('quick_links','Shop','/shop',1),
  ('quick_links','Cart','/cart',2),
  ('policies','Terms and Conditions','/terms',0),
  ('policies','Privacy Policy','/privacy',1),
  ('policies','Returns & Refunds','/returns',2)
) as seed(section, label, url, position)
where not exists (select 1 from public.footer_links);

-- The "Policies" footer column is now fixed in the app itself (Terms &
-- Conditions / Privacy Policy / Returns & Refunds), not editable via the
-- Footer Links admin page — remove any old rows so nothing is orphaned.
delete from public.footer_links where section = 'policies';

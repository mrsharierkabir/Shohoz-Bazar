# Shohaz Bazar — E-commerce Website

A full React + Supabase e-commerce site: storefront (home, shop, product page, cart,
checkout) and an admin panel to manage everything without touching code.

## 1. Set up Supabase (one-time)

1. Go to your project: https://supabase.com/dashboard/project/ivpiwardlmjsogogxpjm
2. Open **SQL Editor** → paste the entire contents of `supabase/schema.sql` → **Run**.
   This creates all tables, security policies, and a public `media` storage bucket
   for your images.
3. Create your admin login: **Authentication → Users → Add user** (email + password).
   This is the account you'll use to log into `/admin/login`. Customer checkout does
   **not** require an account — only the admin panel does.
4. Turn on Realtime for the orders table so the dashboard can pop up new orders
   live: **Database → Replication** → find the `orders` table → toggle it on.
   (If you skip this, orders still show up fine everywhere — you'd just need to
   refresh the Dashboard to see the "new order" popup instead of it appearing
   automatically.)

### Already set this project up before? (you are here)

More tables/columns were added since your last setup: policy pages, order
read-status, order notes, auto-generated invoice numbers, and the rename to
"Shohaz". You don't need to re-run the whole file — just run everything under
the **"MIGRATIONS"** comment near the bottom of `supabase/schema.sql`. It's
written to be safe to run even if parts of it already exist, and it will:

- rename your saved "SHOHOZ" logo text to "SHOHAZ" automatically
- add a `note` column to orders (from the new checkout note field)
- add auto-generated invoice numbers (SB001, SB002, ...) and **backfill** them
  onto any orders you already have
- simplify order statuses down to pending / shipped / delivered / returned /
  cancelled (any existing "confirmed" orders move to "pending")
- add the policy pages table

After running it, also double check **Admin → Site Settings** shows "SHOHAZ"
as Logo Line 1 (the migration updates it automatically, but it's easy to
confirm/adjust there too).

> ⚠️ **Security note:** the database password you shared in chat
> (`qemcod-haqkuj-zupsE5`) is a *Postgres* password — this frontend never uses it
> (only the public "publishable" API key is used, which is safe to expose). Since
> that password was pasted into a chat, I'd recommend rotating it from
> **Project Settings → Database → Reset password** just to be safe, and avoid
> pasting real passwords into chats going forward.

## 2. Run the site locally

```bash
npm install
npm run dev
```

Open the printed local URL (usually http://localhost:5173).

## 3. Build for production / deploy

```bash
npm run build
```

This outputs a static site in `dist/` — deployable to Vercel, Netlify, Cloudflare
Pages, or any static host. No server/back-end needed; everything talks directly to
Supabase.

> This project includes `vercel.json` and `public/_redirects` so that direct or
> hard-refreshed links to internal pages (like `/terms`) work correctly on
> Vercel or Netlify. If you deploy elsewhere, make sure your host redirects all
> unknown paths to `index.html` (standard single-page-app config) — otherwise
> footer links opened directly can 404.

## 4. Using the Admin Panel

- Click **Admin Panel** (top right of the site) → sign in with the account you
  created in step 1.
- **Site Settings** — hotline number, WhatsApp number, "24 hours open" text, "Cash
  on delivery" label, logo text, footer text.
- **Rotating Titles** — the announcement strip under the header; each active title
  rotates automatically every 5 seconds. Add/edit/delete/reorder freely.
- **Banners** — hero banner carousel on the home page. Upload images, optional
  headline/subheadline/link. Auto-advances every 5s; visitors can also use the
  arrows. Use the ↑/↓ buttons to reorder.
- **Categories** — icon + name shown in the sidebar, "Browse Category" grid, and
  shop page filters.
- **Products** — name, category, regular/discounted price (discount % is
  calculated automatically), stock, multiple images, description, delivery info.
  From the product's edit page you can also add:
  - **Options/Variants** (e.g. Size or Type), each with its own photo — shown as
    selectable chips on the product page.
  - **Reviews** — author, star rating, comment.
- **Footer Links** — controls the "Quick Links" column only. The "Policies"
  column is fixed (Terms & Conditions / Privacy Policy / Returns & Refunds) —
  edit its content from Policy Pages below.
- **Policy Pages** — edit the Terms & Conditions (numbered table-of-contents
  style), Privacy Policy, and Returns & Refunds pages. Add/edit/delete/reorder
  sections; each section has a heading and content — start every content line
  with "-" for a bulleted list, or leave it plain for a paragraph.
- **Orders** — organized into tabs: Pending / Shipped / Delivered / Returned /
  Cancelled, each with a live count. Search by invoice number, customer name,
  or phone, and optionally filter to one date. Each order shows its
  auto-generated invoice number (SB001, SB002, ...), the customer's note from
  checkout, and lets you change its status from a dropdown right in the table.

### New-order notifications

The Dashboard shows a 🔔 badge and automatically pops up a card whenever a new
order comes in while you're on that page (via Supabase Realtime), or whenever
there are unread orders when you open it. Mark individual orders as read from
the popup, or use "Mark all as read".

### Mobile admin panel

The sidebar becomes a slide-out drawer on phones — tap the ☰ icon in the top
bar to open it, tap outside or the ✕ to close.

## 5. How the storefront works

- **Cart** is stored in the browser (localStorage) — no login needed to shop.
  Clicking the cart icon or the floating tab on the right opens the popup cart;
  "View Full Cart" goes to the full `/cart` page.
- **Checkout** collects name/phone/address/an optional note and creates a
  Cash-on-Delivery order in Supabase. The phone field only accepts digits, is
  capped at 11 characters, and must start with "01" (e.g. `01712345678`) —
  it's checked as the person types and again before the order submits.
- **WhatsApp Order** button on the product page opens a WhatsApp chat pre-filled
  with the product name, using the number set in Site Settings.

## 6. Project structure

```
src/
  lib/            supabaseClient.js, helpers.js (price/discount/upload utils)
  context/        CartContext, SiteContext (settings + admin auth)
  components/     Header, TopBar, RotatingTitle, CartPopup, HeroBanner,
                  CategorySidebar, BrowseCategories, TrustBar, ProductCard, Footer
  pages/          Home, Shop, AllCategories, ProductPage, CartPage, Checkout,
                  AdminLogin
  admin/          AdminLayout, Dashboard, ManageSettings, ManageTitles,
                  ManageBanners, ManageCategories, ManageProducts,
                  ManageProductForm, ManageFooterLinks, ManageOrders
supabase/
  schema.sql      run once in the Supabase SQL editor
```

Every screen/component lives in its own file as requested.

## 7. Notes

- The **Admin Panel** button currently goes straight to a login form, exactly as
  requested ("later I remove the button and add login section").
- Category "View All" links to `/categories`.
- Product URLs use a slug when available, falling back to the product's ID.
- The discount badge and % are computed automatically from regular vs. discounted
  price — no manual entry needed.
- Nothing is hard-coded/seeded: banners, categories, products, titles, and footer
  links all start empty and are fully controlled from the Admin Panel.

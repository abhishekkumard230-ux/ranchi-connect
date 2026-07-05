# Ranchi Connect

> The exclusive online community for Ranchi residents. Share news, events, questions, listings, jobs and recommendations with your neighbours.

Built with **Next.js 15** (App Router), **Supabase** (Auth + Postgres + Realtime + Storage), **Tailwind CSS**, and **shadcn/ui**.

---

## ✨ Features

- 🔐 **Auth** — Email + password (with verification), Google OAuth
- 🏠 **Feed** — 7 categories (News, Events, Questions, Buy & Sell, Jobs, Recommendations, General), infinite scroll, search, dark mode
- 📝 **Posts** — Text + image uploads (Supabase Storage), likes, threaded comments (5 levels deep), @mentions, delete, report
- 🔔 **Realtime notifications** — likes, comments, replies, follows, mentions, admin actions, direct messages
- 💬 **Direct Messages** — 1:1 chats with realtime delivery, typing indicator, read receipts, image share, emoji, delete-own
- 👥 **Profiles** — Follow/unfollow, followers/following counts, posts list, edit avatar/bio/username
- 🔍 **SEO** — SSR post pages, dynamic OG metadata, sitemap.xml, robots.txt
- 🛡️ **Security** — Row-Level Security on every table; RLS-safe RPC for conversation creation
- 📱 **Mobile-first** — responsive down to 393px, pull-to-refresh, native share sheet

---

## 🚀 Quick Start

### 1. Clone and install
```bash
git clone https://github.com/abhishekkumard230-ux/ranchi-connect.git
cd ranchi-connect
yarn install
```

### 2. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com/)
2. Go to **SQL Editor** and run each migration in order:
   - `supabase_schema.sql`
   - `supabase_schema_v2.sql`
   - `supabase_schema_v3.sql`
   - `supabase_schema_v4.sql`
   - `supabase_schema_v5.sql`
3. In **Auth → Providers → Email**: enable email confirmations (or disable for local dev)
4. Optional: In **Auth → Providers → Google**, enable and paste your Google OAuth client ID + secret

### 3. Set up environment variables
```bash
cp .env.example .env.local
# then edit .env.local with your Supabase URL + anon + service_role keys
```

### 4. Run dev server
```bash
yarn dev
```
App runs at http://localhost:3000

---

## 🌐 Deploy to Vercel

1. Push this repo to GitHub (already done ✅)
2. Go to [vercel.com/new](https://vercel.com/new) → Import from GitHub → select `ranchi-connect`
3. In the import screen, add these **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_BASE_URL` — set to your Vercel URL (e.g. `https://ranchi-connect.vercel.app`)
   - `CORS_ORIGINS=*`
4. Click **Deploy**
5. Once deployed, go back to Supabase → **Auth → URL Configuration** and add:
   - **Site URL**: `https://your-domain.vercel.app`
   - **Redirect URLs**: `https://your-domain.vercel.app/**` and `https://your-domain.vercel.app/auth/callback`
6. For Google OAuth: in Google Cloud Console, add your Vercel domain to **Authorized JavaScript origins** and add `https://your-project.supabase.co/auth/v1/callback` to **Authorized redirect URIs** (Supabase handles the exchange)

---

## 📂 Project Structure

```
app/
├── api/[[...path]]/route.js   # Health check endpoint
├── auth/callback/route.js     # OAuth exchange
├── messages/page.js           # DM inbox + chat UI
├── post/[id]/page.js          # SSR post detail
├── layout.js, page.js         # Root layout + main feed
└── not-found.js, error.js, loading.js

components/
├── ui/                        # shadcn/ui primitives
└── ranchi/                    # Feature components
    ├── threaded-comments.jsx
    ├── user-profile-view.jsx
    └── notifications-sheet.jsx

lib/supabase/
├── client.js                  # Browser Supabase client (cookies)
└── server.js                  # Server Supabase client (SSR)

supabase_schema*.sql          # SQL migrations v1-v5
scripts/                       # Admin/seed scripts
```

---

## 🧪 Test Accounts (dev)

- `alice.test@ranchiconnect.dev` / `Password123!`
- `bob.test@ranchiconnect.dev` / `Password123!`

Seed them by running:
```bash
node scripts/seed_test_users.js
```

---

## 📜 License

MIT — built with ❤️ for Ranchi.

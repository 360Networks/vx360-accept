# VX-360 E-Signature Setup Guide

## What You're Building
A professional quote acceptance system where customers click a link in their email, 
see your quote beautifully displayed, and sign electronically. All free.

---

## Step 1: Create a Supabase Project (2 minutes)

1. Go to **https://supabase.com** → Sign up (free)
2. Click **New Project** → name it `vx360-quotes`
3. Choose a strong database password (save it, but you won't need it day-to-day)
4. Wait ~30 seconds for it to spin up
5. Once ready, go to **Project Settings → API** and copy:
   - **Project URL** (looks like `https://abcdefg.supabase.co`)
   - **anon public key** (the long `eyJhbG...` string)

## Step 2: Create the Database Table (1 minute)

1. In Supabase, go to **SQL Editor** → click **New Query**
2. Paste the entire contents of `SUPABASE_SCHEMA.sql` 
3. Click **Run** → you should see "Success. No rows returned"
4. Go to **Table Editor** — you should see a `quotes` table and a `quote_views` table

## Step 3: Deploy the Acceptance Page to Vercel (3 minutes)

### Option A: Drag & Drop (Easiest)
1. Go to **https://vercel.com** → Sign up (free, use GitHub)
2. Install Vercel CLI: `npm i -g vercel`
3. Open Terminal, `cd` to the `vx360-accept` folder
4. Run `vercel` → follow prompts → it deploys!
5. Copy the URL it gives you (like `https://vx360-accept.vercel.app`)

### Option B: GitHub Deploy
1. Create a GitHub repo called `vx360-accept`
2. Push the `vx360-accept` folder to it
3. In Vercel, click **Import Project** → select the repo → Deploy
4. Copy the URL

### IMPORTANT: Update the acceptance page with your Supabase credentials
Before deploying, edit `vx360-accept/public/index.html` and replace:
```
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```
With your actual Supabase Project URL and anon key from Step 1.

## Step 4: Configure the CRM (30 seconds)

1. Open your 360 CRM app
2. Go to PBX Quote → Preview any quote
3. Click the **⚙️** gear icon next to "Email Quote"
4. Fill in:
   - **Supabase Project URL**: the URL from Step 1
   - **Supabase Anon Key**: the anon key from Step 1  
   - **Acceptance Page URL**: the Vercel URL from Step 3
5. Click **Save Settings**

---

## That's It! Here's What Happens Now:

1. You build a PBX quote → Preview → **Email Quote** → **Send with Tracking**
2. Customer receives a professional email with:
   - Your message and quote summary
   - The PDF attached
   - A big green **"✓ Review & Accept Quote"** button
3. Customer clicks the button → sees a stunning branded page with:
   - Full quote details and line items
   - A signature pad to draw their signature
   - Terms acceptance checkbox
   - **"Accept & Sign Quote"** button
4. They sign → data saved to Supabase → success confirmation shown
5. In your CRM, the prospect detail shows the signature status

---

## Costs
- Supabase Free Tier: $0/mo (up to 500MB database, 50K monthly requests)
- Vercel Free Tier: $0/mo (up to 100GB bandwidth)
- **Total: $0/month**

## Files Overview
- `SUPABASE_SCHEMA.sql` — Run in Supabase SQL Editor
- `vx360-accept/public/index.html` — The acceptance page (deploy to Vercel)
- `vx360-accept/vercel.json` — Vercel routing config
- `main.js` — Updated CRM backend (replace your current one)
- `preload.js` — Updated CRM preload (replace your current one)  
- `index.html` — Updated CRM frontend (replace your current one)

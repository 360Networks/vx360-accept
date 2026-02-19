-- ============================================================
-- VX-360 Quote Acceptance System — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. Quotes table: stores sent quote data
CREATE TABLE quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  quote_number TEXT NOT NULL,
  prospect_id TEXT,
  
  -- Company / Contact info
  company TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  
  -- Financial summary
  monthly_recurring NUMERIC(10,2) DEFAULT 0,
  onetime_fees NUMERIC(10,2) DEFAULT 0,
  total_due NUMERIC(10,2) DEFAULT 0,
  
  -- Line items stored as JSON array
  line_items JSONB DEFAULT '[]',
  optional_items JSONB DEFAULT '[]',
  
  -- Quote metadata
  quote_date DATE,
  expiration_date DATE,
  prepared_by TEXT DEFAULT 'Kenneth White',
  
  -- Status tracking
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'signed', 'declined', 'expired')),
  view_count INTEGER DEFAULT 0,
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  
  -- Signature data
  signed_at TIMESTAMPTZ,
  signer_name TEXT,
  signer_title TEXT,
  signature_data TEXT, -- base64 PNG of drawn signature
  signer_ip TEXT,
  signer_browser TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Quote views: tracks every time someone opens the acceptance page
CREATE TABLE quote_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT
);

-- 3. Enable Row Level Security
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_views ENABLE ROW LEVEL SECURITY;

-- 4. Policies: allow anonymous read/update for quotes (customers don't have accounts)
CREATE POLICY "Anyone can view quotes by token"
  ON quotes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update quote signature"
  ON quotes FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can insert quotes"
  ON quotes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert views"
  ON quote_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read views"
  ON quote_views FOR SELECT
  USING (true);

-- 5. Index for fast token lookups
CREATE INDEX idx_quotes_token ON quotes(token);
CREATE INDEX idx_quotes_prospect ON quotes(prospect_id);
CREATE INDEX idx_quote_views_quote ON quote_views(quote_id);

-- 6. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

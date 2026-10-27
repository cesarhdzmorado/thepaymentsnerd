-- Migration: Add referral system to subscribers table
-- Run this in your Supabase SQL editor

-- Add referral columns to subscribers table
ALTER TABLE public.subscribers
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by TEXT REFERENCES public.subscribers(referral_code) ON DELETE SET NULL;

-- Create index for faster referral lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_referral_code ON public.subscribers(referral_code);
CREATE INDEX IF NOT EXISTS idx_subscribers_referred_by ON public.subscribers(referred_by);

-- Add email_analytics table for tracking email events from Resend webhooks
CREATE TABLE IF NOT EXISTS public.email_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'delivered', 'opened', 'clicked', 'bounced', 'complained'
  newsletter_date TEXT, -- matches publication_date from newsletters table
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB -- store additional event data
);

-- Create indexes for email analytics
CREATE INDEX IF NOT EXISTS idx_email_analytics_email ON public.email_analytics(email);
CREATE INDEX IF NOT EXISTS idx_email_analytics_event_type ON public.email_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_email_analytics_newsletter_date ON public.email_analytics(newsletter_date);
CREATE INDEX IF NOT EXISTS idx_email_analytics_created_at ON public.email_analytics(created_at);

-- Data API access is explicit from 30 October 2026. The Resend webhook uses
-- the server-side service-role client; browser roles must not access analytics.
REVOKE ALL PRIVILEGES ON TABLE public.email_analytics FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_analytics TO service_role;
ALTER TABLE public.email_analytics ENABLE ROW LEVEL SECURITY;

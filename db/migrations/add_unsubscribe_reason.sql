-- Migration: Add unsubscribe reason tracking to subscribers table
-- Run this in your Supabase SQL editor

-- Add unsubscribe reason columns to subscribers table
ALTER TABLE public.subscribers
ADD COLUMN IF NOT EXISTS unsubscribe_reason TEXT,
ADD COLUMN IF NOT EXISTS unsubscribe_feedback TEXT;

-- Create index for analytics on unsubscribe reasons
CREATE INDEX IF NOT EXISTS idx_subscribers_unsubscribe_reason ON public.subscribers(unsubscribe_reason);

COMMENT ON COLUMN public.subscribers.unsubscribe_reason IS 'Primary reason for unsubscribing: too_frequent, not_relevant, too_long, quality, other';
COMMENT ON COLUMN public.subscribers.unsubscribe_feedback IS 'Optional feedback from user about why they unsubscribed';

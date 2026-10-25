-- Per-address throttle for transactional emails sent by /api/subscribe
-- ("Confirm your subscription" / "You're already subscribed").
--
-- Without this, anyone can make the site email an arbitrary address on every
-- request; the in-memory per-IP limiter does nothing against IP rotation.
-- Apply BEFORE deploying the web change that calls claim_subscribe_email_slot.

ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS subscribe_email_last_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscribe_email_window_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscribe_email_window_count INTEGER NOT NULL DEFAULT 0;

-- Atomically claim the right to send one subscribe-flow email to p_email.
-- Returns true (and records the send) only if at least p_min_interval has
-- passed since the last one and fewer than p_max_per_day were sent in the
-- current 24h window. A single UPDATE takes the row lock, so concurrent
-- requests for the same address cannot both win.
CREATE OR REPLACE FUNCTION public.claim_subscribe_email_slot(
  p_email TEXT,
  p_min_interval INTERVAL,
  p_max_per_day INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  claimed BOOLEAN;
BEGIN
  UPDATE public.subscribers AS s
  SET
    subscribe_email_last_sent_at = now(),
    subscribe_email_window_start = CASE
      WHEN s.subscribe_email_window_start IS NULL
        OR s.subscribe_email_window_start <= now() - INTERVAL '24 hours'
      THEN now()
      ELSE s.subscribe_email_window_start
    END,
    subscribe_email_window_count = CASE
      WHEN s.subscribe_email_window_start IS NULL
        OR s.subscribe_email_window_start <= now() - INTERVAL '24 hours'
      THEN 1
      ELSE s.subscribe_email_window_count + 1
    END
  WHERE s.email = p_email
    AND (s.subscribe_email_last_sent_at IS NULL
         OR s.subscribe_email_last_sent_at <= now() - p_min_interval)
    AND (s.subscribe_email_window_start IS NULL
         OR s.subscribe_email_window_start <= now() - INTERVAL '24 hours'
         OR s.subscribe_email_window_count < p_max_per_day)
  RETURNING true INTO claimed;

  RETURN COALESCE(claimed, false);
END;
$$;

-- Server-side only (service role). Never callable with the public anon key.
REVOKE ALL ON FUNCTION public.claim_subscribe_email_slot(TEXT, INTERVAL, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_subscribe_email_slot(TEXT, INTERVAL, INTEGER) TO service_role;

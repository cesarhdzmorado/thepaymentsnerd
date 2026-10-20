-- Supabase Data API grants required for tables created or recreated after
-- 30 October 2026. Revoke legacy browser-role access first so existing tables
-- and newly created tables converge on the same least-privilege policy.

REVOKE ALL PRIVILEGES ON TABLE public.subscribers FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.newsletters FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.email_analytics FROM anon, authenticated;

-- Public website reads published newsletter data with the anon client.
GRANT SELECT ON TABLE public.newsletters TO anon;

-- All writes and subscriber/analytics access happen through server-side code
-- using SUPABASE_SERVICE_ROLE_KEY.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscribers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.newsletters TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_analytics TO service_role;

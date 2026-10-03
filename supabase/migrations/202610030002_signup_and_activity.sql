BEGIN;

-- Keep the existing before/after record audit, and identify the human operator.
ALTER TABLE public.billing_audit ADD COLUMN actor_email text;
UPDATE public.billing_audit audit SET actor_email=users.email
  FROM auth.users users WHERE audit.actor=users.id::text;
CREATE OR REPLACE FUNCTION public.audit_billing_change() RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.billing_audit(actor,actor_email,table_name,operation,before_row,after_row)
  VALUES (nullif(current_setting('billing.actor',true),''),
    nullif(current_setting('billing.actor_email',true),''),TG_TABLE_NAME,TG_OP,
    CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_billing_change() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.billing_access_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text NOT NULL,
  event text NOT NULL CHECK (event IN ('login','password_changed','account_created'))
);
ALTER TABLE public.billing_access_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_access_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.billing_access_events_id_seq FROM PUBLIC, anon, authenticated;

-- A shared invite code is rate-limited globally to slow guessing attempts.
CREATE TABLE public.billing_signup_guard (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until timestamptz
);
ALTER TABLE public.billing_signup_guard ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_signup_guard FROM PUBLIC, anon, authenticated;
INSERT INTO public.billing_signup_guard(singleton) VALUES (true);

COMMIT;

-- Pause SMS delivery without editing or deleting any queued messages.
BEGIN;

CREATE TABLE public.sms_dispatch_control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  paused boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_email text
);
ALTER TABLE public.sms_dispatch_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sms_dispatch_control FROM PUBLIC, anon, authenticated;
INSERT INTO public.sms_dispatch_control(singleton,paused) VALUES (true,false);

ALTER TABLE public.billing_access_events DROP CONSTRAINT billing_access_events_event_check;
ALTER TABLE public.billing_access_events ADD CONSTRAINT billing_access_events_event_check
  CHECK (event IN ('login','password_changed','account_created','sms_dispatch_paused','sms_dispatch_resumed'));

CREATE TRIGGER billing_changed AFTER INSERT OR UPDATE OR DELETE ON public.sms_dispatch_control
  FOR EACH STATEMENT EXECUTE FUNCTION public.notify_billing_change();

COMMIT;

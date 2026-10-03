-- Apply first to a restored TEST project. This adds access control and notifications;
-- it does not change, truncate or rewrite any customer/loan/SMS record.
BEGIN;

CREATE TABLE public.billing_operators (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_operators ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_operators FROM anon, authenticated;
GRANT SELECT ON public.billing_operators TO authenticated;
CREATE POLICY billing_operator_self ON public.billing_operators FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- The SQL API must not expose the shop's existing tables through public keys.
-- The Edge Function connects privately with a trusted database role.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','transactions','sms_queue','devices','sms_templates','item_catalog'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
  END LOOP;
END $$;

CREATE TABLE public.billing_changes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.billing_bridge_keys (
  device_id text PRIMARY KEY REFERENCES public.devices("deviceUuid"),
  token_hash text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true
);
ALTER TABLE public.billing_bridge_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_bridge_keys FROM anon, authenticated;
CREATE TABLE public.billing_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  changed_at timestamptz NOT NULL DEFAULT now(),
  actor text,
  table_name text NOT NULL,
  operation text NOT NULL,
  before_row jsonb,
  after_row jsonb
);
ALTER TABLE public.billing_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_audit FROM anon, authenticated;
CREATE FUNCTION public.audit_billing_change() RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.billing_audit(actor,table_name,operation,before_row,after_row)
  VALUES (current_setting('billing.actor',true),TG_TABLE_NAME,TG_OP,
    CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_billing_change() FROM PUBLIC;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','transactions','sms_templates','item_catalog'] LOOP
    EXECUTE format('CREATE TRIGGER billing_audited AFTER INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.audit_billing_change()',t);
  END LOOP;
END $$;
ALTER TABLE public.billing_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_changes FROM anon, authenticated;
GRANT SELECT ON public.billing_changes TO authenticated;
CREATE POLICY billing_change_read ON public.billing_changes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.billing_operators WHERE user_id=(SELECT auth.uid()))
);

CREATE FUNCTION public.notify_billing_change() RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.billing_changes(topic) VALUES (TG_TABLE_NAME);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_billing_change() FROM PUBLIC;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','transactions','sms_queue','devices','sms_templates','item_catalog'] LOOP
    EXECUTE format('CREATE TRIGGER billing_changed AFTER INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH STATEMENT EXECUTE FUNCTION public.notify_billing_change()',t);
  END LOOP;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_changes;

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
  VALUES ('billing-documents','billing-documents',false,10485760,ARRAY['application/pdf','image/jpeg','image/png','image/webp']);
CREATE POLICY billing_document_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='billing-documents' AND
  EXISTS (SELECT 1 FROM public.billing_operators WHERE user_id=(SELECT auth.uid()))
);
CREATE POLICY billing_document_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id='billing-documents' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text AND
  EXISTS (SELECT 1 FROM public.billing_operators WHERE user_id=(SELECT auth.uid()))
);
-- Restrictive guards prevent an older broad Storage policy from opening this bucket.
CREATE POLICY billing_document_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (
  bucket_id<>'billing-documents' OR EXISTS (
    SELECT 1 FROM public.billing_operators WHERE user_id=(SELECT auth.uid())
  )
);
CREATE POLICY billing_document_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (
  bucket_id<>'billing-documents' OR (
    (storage.foldername(name))[1]=(SELECT auth.uid())::text AND EXISTS (
      SELECT 1 FROM public.billing_operators WHERE user_id=(SELECT auth.uid())
    )
  )
);
CREATE POLICY billing_document_no_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (bucket_id<>'billing-documents') WITH CHECK (bucket_id<>'billing-documents');
CREATE POLICY billing_document_no_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (bucket_id<>'billing-documents');
-- No UPDATE/DELETE policy: uploaded documents cannot be overwritten or removed by browser clients.
COMMIT;

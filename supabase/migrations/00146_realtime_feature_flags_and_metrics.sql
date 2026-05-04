BEGIN;

CREATE TABLE IF NOT EXISTS public.realtime_feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.realtime_delivery_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL,
  conference_id uuid REFERENCES public.conferences(id) ON DELETE CASCADE,
  event_version bigint,
  value_numeric double precision,
  value_text text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_realtime_metrics_key_created
  ON public.realtime_delivery_metrics (metric_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_conference_created
  ON public.realtime_delivery_metrics (conference_id, created_at DESC);

ALTER TABLE public.realtime_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_delivery_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY realtime_feature_flags_select_staff ON public.realtime_feature_flags
FOR SELECT TO authenticated
USING (public.is_staff_user(auth.uid()));

CREATE POLICY realtime_feature_flags_write_admin ON public.realtime_feature_flags
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'smt')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'smt')
  )
);

CREATE POLICY realtime_metrics_select_staff ON public.realtime_delivery_metrics
FOR SELECT TO authenticated
USING (public.is_staff_user(auth.uid()));

CREATE POLICY realtime_metrics_insert_staff ON public.realtime_delivery_metrics
FOR INSERT TO authenticated
WITH CHECK (public.is_staff_user(auth.uid()));

INSERT INTO public.realtime_feature_flags(key, enabled, config)
VALUES
  ('realtime.audited_notes_pipeline', false, '{"mode":"shadow"}'::jsonb),
  ('realtime.strict_delivery_receipts', false, '{"readAckRequired":true}'::jsonb),
  ('realtime.chamber_scope_enforcement', true, '{"version":"v1"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;

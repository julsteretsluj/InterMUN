-- Secretariat self-serve registration intake (features, counts, file uploads, deferred setup).

BEGIN;

CREATE TABLE IF NOT EXISTS public.secretariat_registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  conference_name text NOT NULL,
  event_dates text,
  committee_count integer NOT NULL CHECK (committee_count >= 1 AND committee_count <= 64),
  delegate_count integer CHECK (delegate_count IS NULL OR delegate_count >= 0),
  chair_count integer CHECK (chair_count IS NULL OR chair_count >= 0),
  selected_features text[] NOT NULL DEFAULT '{}'::text[],
  committees jsonb NOT NULL DEFAULT '[]'::jsonb,
  award_criteria_deferred boolean NOT NULL DEFAULT false,
  matrix_deferred boolean NOT NULL DEFAULT true,
  rop_storage_path text,
  rop_status text NOT NULL DEFAULT 'not_submitted'
    CHECK (rop_status IN ('not_submitted', 'pending_review', 'complete')),
  award_criteria_storage_path text,
  award_criteria_status text NOT NULL DEFAULT 'not_submitted'
    CHECK (award_criteria_status IN ('not_submitted', 'deferred', 'pending_review', 'complete')),
  schedule_storage_path text,
  schedule_status text NOT NULL DEFAULT 'not_submitted'
    CHECK (schedule_status IN ('not_submitted', 'pending_review', 'complete')),
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'complete', 'archived')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS secretariat_registration_requests_status_idx
  ON public.secretariat_registration_requests (status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS secretariat_registration_requests_email_idx
  ON public.secretariat_registration_requests (lower(contact_email));

COMMENT ON TABLE public.secretariat_registration_requests IS
  'Secretariat onboarding intake: feature selection, committee drafts, and uploads pending manual fulfillment.';

ALTER TABLE public.secretariat_registration_requests ENABLE ROW LEVEL SECURITY;

-- Public insert (anon + authenticated) for the registration form.
CREATE POLICY secretariat_registration_requests_insert_public
  ON public.secretariat_registration_requests FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Staff read/update.
CREATE POLICY secretariat_registration_requests_select_staff
  ON public.secretariat_registration_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'smt')
    )
  );

CREATE POLICY secretariat_registration_requests_update_staff
  ON public.secretariat_registration_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'smt')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'smt')
    )
  );

-- Storage bucket for ROP, schedule, award criteria, committee logos (staff-only read).
INSERT INTO storage.buckets (id, name, public)
VALUES ('secretariat-onboarding', 'secretariat-onboarding', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY secretariat_onboarding_insert_public
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'secretariat-onboarding');

CREATE POLICY secretariat_onboarding_select_staff
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'secretariat-onboarding'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'smt')
    )
  );

COMMIT;

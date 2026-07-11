-- Conference logo (mandatory at registration intake).

BEGIN;

ALTER TABLE public.secretariat_registration_requests
  ADD COLUMN IF NOT EXISTS conference_logo_storage_path text,
  ADD COLUMN IF NOT EXISTS conference_logo_status text NOT NULL DEFAULT 'not_submitted'
    CHECK (conference_logo_status IN ('not_submitted', 'pending_review', 'complete'));

COMMENT ON COLUMN public.secretariat_registration_requests.conference_logo_storage_path IS
  'Storage path in secretariat-onboarding bucket for the conference mark/logo.';

COMMIT;

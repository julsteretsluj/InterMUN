-- Matrix roster details (email, grade, status, backup) for people who do not have a login yet.
-- allocations.display_*_override is readable by delegates, so contact data lives here, staff-only.

CREATE TABLE IF NOT EXISTS public.allocation_roster_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.conference_events(id) ON DELETE CASCADE,
  source_key text NOT NULL,
  allocation_id uuid REFERENCES public.allocations(id) ON DELETE SET NULL,
  committee text,
  role text NOT NULL CHECK (role IN ('delegate', 'chair', 'smt', 'advisor', 'press')),
  position text,
  full_name text NOT NULL,
  email text,
  grade text,
  school text,
  placard_code text,
  matrix_id text,
  status text,
  notes text,
  backup_allocation text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, source_key)
);

CREATE INDEX IF NOT EXISTS idx_allocation_roster_contacts_allocation
  ON public.allocation_roster_contacts (allocation_id);
CREATE INDEX IF NOT EXISTS idx_allocation_roster_contacts_email
  ON public.allocation_roster_contacts (lower(email));

ALTER TABLE public.allocation_roster_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allocation_roster_contacts_staff_all ON public.allocation_roster_contacts;
CREATE POLICY allocation_roster_contacts_staff_all
  ON public.allocation_roster_contacts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = ANY (ARRAY['admin'::public.user_role, 'smt'::public.user_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = ANY (ARRAY['admin'::public.user_role, 'smt'::public.user_role])
    )
  );

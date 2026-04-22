BEGIN;

CREATE TABLE IF NOT EXISTS public.chair_session_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  raised_by_allocation_id uuid REFERENCES public.allocations(id) ON DELETE SET NULL,
  point_code text NOT NULL CHECK (
    point_code IN (
      'poi',
      'poc',
      'parliamentary_inquiry',
      'order',
      'personal_privilege',
      'right_of_reply',
      'fact_check'
    )
  ),
  detail text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'denied')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chair_session_points_conference_created_idx
  ON public.chair_session_points (conference_id, created_at DESC);

ALTER TABLE public.chair_session_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chair_session_points_select_staff"
  ON public.chair_session_points FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

CREATE POLICY "chair_session_points_insert_staff"
  ON public.chair_session_points FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

CREATE POLICY "chair_session_points_update_staff"
  ON public.chair_session_points FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('chair', 'smt', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

CREATE TABLE IF NOT EXISTS public.vote_rights_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_item_id uuid NOT NULL REFERENCES public.vote_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote_value text NOT NULL CHECK (vote_value IN ('yes', 'no')),
  statement text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vote_item_id, user_id)
);

CREATE INDEX IF NOT EXISTS vote_rights_statements_vote_item_idx
  ON public.vote_rights_statements (vote_item_id, created_at DESC);

ALTER TABLE public.vote_rights_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vote_rights_statements_select_staff"
  ON public.vote_rights_statements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE vi.id = vote_rights_statements.vote_item_id
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

CREATE POLICY "vote_rights_statements_insert_staff"
  ON public.vote_rights_statements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE vi.id = vote_rights_statements.vote_item_id
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

CREATE POLICY "vote_rights_statements_update_staff"
  ON public.vote_rights_statements FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE vi.id = vote_rights_statements.vote_item_id
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE vi.id = vote_rights_statements.vote_item_id
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

CREATE POLICY "vote_rights_statements_delete_staff"
  ON public.vote_rights_statements FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE vi.id = vote_rights_statements.vote_item_id
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

COMMIT;

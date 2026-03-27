CREATE TABLE IF NOT EXISTS public.allocation_signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  allocation_id UUID NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_allocation_signup_pending_by_user_conference
  ON public.allocation_signup_requests (conference_id, requested_by)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_allocation_signup_pending_by_allocation
  ON public.allocation_signup_requests (conference_id, allocation_id)
  WHERE status = 'pending';

ALTER TABLE public.allocation_signup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Delegates can request own allocation signup" ON public.allocation_signup_requests;
CREATE POLICY "Delegates can request own allocation signup"
ON public.allocation_signup_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = requested_by
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('delegate', 'chair')
  )
  AND EXISTS (
    SELECT 1
    FROM public.allocations a
    WHERE a.id = allocation_signup_requests.allocation_id
      AND a.conference_id = allocation_signup_requests.conference_id
      AND a.user_id IS NULL
  )
);

DROP POLICY IF EXISTS "Users can view own signup requests" ON public.allocation_signup_requests;
CREATE POLICY "Users can view own signup requests"
ON public.allocation_signup_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = requested_by
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('smt', 'admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.allocations a ON a.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role::text = 'chair'
      AND a.conference_id = allocation_signup_requests.conference_id
  )
);

DROP POLICY IF EXISTS "Chairs or SMT can review signup requests" ON public.allocation_signup_requests;
CREATE POLICY "Chairs or SMT can review signup requests"
ON public.allocation_signup_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('smt', 'admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.allocations a ON a.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role::text = 'chair'
      AND a.conference_id = allocation_signup_requests.conference_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('smt', 'admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.allocations a ON a.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role::text = 'chair'
      AND a.conference_id = allocation_signup_requests.conference_id
  )
);

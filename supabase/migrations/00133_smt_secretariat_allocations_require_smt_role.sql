-- Anyone seated on the SMT / secretariat committee must not remain role delegate (signup default).
-- 00129/00130 linked allocations but did not always promote profile.role.

UPDATE public.profiles p
SET
  role = 'smt'::public.user_role,
  updated_at = NOW()
WHERE p.role = 'delegate'::public.user_role
  AND EXISTS (
    SELECT 1
    FROM public.allocations a
    INNER JOIN public.conferences c ON c.id = a.conference_id
    WHERE a.user_id = p.id
      AND (
        lower(btrim(c.committee)) = 'smt'
        OR upper(btrim(c.committee_code)) IN ('SMT227', 'SECRETARIAT2027')
      )
  );

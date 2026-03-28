-- Unassigned dais seats for every committee: Head Chair and Co-chair (canonical labels).
-- Co-chair is skipped if a "co chair" (space) row already exists.

INSERT INTO public.allocations (conference_id, country, user_id)
SELECT c.id, 'Head Chair', NULL
FROM public.conferences c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.allocations a
  WHERE a.conference_id = c.id
    AND lower(trim(a.country)) = 'head chair'
);

INSERT INTO public.allocations (conference_id, country, user_id)
SELECT c.id, 'Co-chair', NULL
FROM public.conferences c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.allocations a
  WHERE a.conference_id = c.id
    AND lower(trim(a.country)) IN ('co-chair', 'co chair')
);

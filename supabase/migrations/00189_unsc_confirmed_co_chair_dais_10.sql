-- Official SEAMUN I 2027 matrix: UNSC Co-chair is confirmed (Miki Roex), placard DAIS-10.

INSERT INTO public.allocation_gate_codes (allocation_id, code, updated_at)
SELECT a.id, 'DAIS-10', NOW()
FROM public.allocations a
WHERE a.conference_id = 'e2b02bf8-bd34-5fce-a231-318de3f818b2'
  AND lower(trim(a.country)) IN ('co-chair', 'co chair')
ON CONFLICT (allocation_id) DO UPDATE
SET code = EXCLUDED.code,
    updated_at = EXCLUDED.updated_at;

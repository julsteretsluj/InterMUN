-- Official matrix: FWC Co-chair is Veda Iyer (KIS), placard DAIS-16.
-- Name is stored on the seat without creating a login until SMT sends an invite.

UPDATE public.allocations
SET
  display_name_override = 'Veda Iyer',
  display_school_override = 'KIS'
WHERE conference_id = '5ed866f9-bd94-5207-8ea1-10e0936d4595'
  AND lower(trim(country)) IN ('co-chair', 'co chair');

INSERT INTO public.allocation_gate_codes (allocation_id, code, updated_at)
SELECT a.id, 'DAIS-16', NOW()
FROM public.allocations a
WHERE a.conference_id = '5ed866f9-bd94-5207-8ea1-10e0936d4595'
  AND lower(trim(a.country)) IN ('co-chair', 'co chair')
ON CONFLICT (allocation_id) DO UPDATE
SET code = EXCLUDED.code,
    updated_at = EXCLUDED.updated_at;

-- Official matrix: UNSC Co-chair is Miki Roex (NIST). Name is stored on the
-- seat without creating a login until SMT sends an invite.

UPDATE public.allocations
SET
  display_name_override = 'Miki Roex',
  display_school_override = 'NIST'
WHERE conference_id = 'e2b02bf8-bd34-5fce-a231-318de3f818b2'
  AND lower(trim(country)) IN ('co-chair', 'co chair');

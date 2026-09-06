-- Copyright (c) 2026 Intermun. All rights reserved.
-- FWC Evidence Library: chair-only catalog + found/location state.
-- Seeded from FWC Evidence Library (SEAMUN I 2027).xlsx Sheet1 (30 rows).

BEGIN;

CREATE TABLE IF NOT EXISTS public.fwc_evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  slug text NOT NULL,
  category text NOT NULL DEFAULT '',
  title text NOT NULL,
  starting_location text NOT NULL DEFAULT '',
  discoverable_by text NOT NULL DEFAULT '',
  tactical_effect text NOT NULL DEFAULT '',
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_secret boolean NOT NULL DEFAULT false,
  found boolean NOT NULL DEFAULT false,
  current_location text,
  held_by_allocation_id uuid REFERENCES public.allocations(id) ON DELETE SET NULL,
  found_by_allocation_id uuid REFERENCES public.allocations(id) ON DELETE SET NULL,
  found_at timestamptz,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conference_id, slug)
);

CREATE INDEX IF NOT EXISTS fwc_evidence_items_conference_id_idx
  ON public.fwc_evidence_items (conference_id);
CREATE INDEX IF NOT EXISTS fwc_evidence_items_found_idx
  ON public.fwc_evidence_items (conference_id, found);
CREATE INDEX IF NOT EXISTS fwc_evidence_items_held_by_idx
  ON public.fwc_evidence_items (held_by_allocation_id);

COMMENT ON TABLE public.fwc_evidence_items IS
  'FWC evidence catalog + chair monitor state. Canonical FWC conference_id. Chair/SMT/admin only.';

CREATE TABLE IF NOT EXISTS public.fwc_evidence_sources (
  conference_id uuid PRIMARY KEY REFERENCES public.conferences(id) ON DELETE CASCADE,
  storage_bucket text NOT NULL DEFAULT 'guide-files',
  storage_path text NOT NULL,
  filename text NOT NULL,
  public_url text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.fwc_evidence_sources IS
  'Source .xlsx for the FWC evidence library, stored in the existing guide-files bucket.';

-- Seed catalog for every FWC conference row (app reads the canonical chamber id).
-- Do not overwrite found / location / holder / notes on re-run.
WITH catalog (slug, category, title, starting_location, discoverable_by, tactical_effect) AS (
  VALUES
    ('EVD-01', 'Biological', 'Encapsulated Spore Sample', 'H3 (Gate Alpha)', 'Bio-Hazard Response Equipment', 'Can be analyzed to confirm Upside Down expansion or burned to clear 1 tile.'),
    ('EVD-02', 'Classified', 'MKUltra Subject Telemetry Log', 'B3 (Hawkins Lab Sub-Level 3)', 'DoE Clearance / Subterranean Infiltration', 'Exposes Brenner''s experiments; grants +1 against psychological attacks.'),
    ('EVD-03', 'Physical', 'Crushed Civilian Vehicle', 'C6 (Downtown Hawkins)', 'HPD Subpoena / Public Investigation', 'Proves physical entity presence; reduces Public Panic meter if covered up.'),
    ('EVD-04', 'Photographic', '35mm Photo of Dimensional Portal', 'B2 (Lab Perimeter)', 'Joyce Byers / 35mm Camera', 'Leaking to media triggers Federal Override or cancels active press gag orders.'),
    ('EVD-05', 'Technical', 'Intercepted Soviet Radio Transcript', 'J10 (Subterranean Base)', 'Radio-Jamming Truck / Broad-Spectrum Array', 'Reveals KGB troop coordinates and portal drill operational status.'),
    ('EVD-06', 'Audio', 'Tape Recording of Creature Roar', 'Outer Woods / Field Recon', 'Reel-to-Reel Audio Recorder', 'Public release increases Public Panic by +15%; proves non-human entity existence.'),
    ('EVD-07', 'Biological', 'Corrupted Tendril Vine Segment', 'H8 (Creel House)', 'Flamethrower Ordnance / Thermal Unit', 'Identifies thermal vulnerabilities; reveals Hive Mind communication channels.'),
    ('EVD-08', 'Document', 'Unmarked Wiretap Log Sheet', 'B8 (Police Dept)', 'Connie Frazier / HPD Intercept', 'Exposes character communication networks and secret backroom pacts.'),
    ('EVD-09', 'Physical', 'Forged U.S. Identification Papers', 'Off-Grid Hideout / Getaway Van', 'Kali Prasad / KGB Infiltration Units', 'Proves foreign or rogue vigilante presence inside municipal borders.'),
    ('EVD-10', 'Chemical', 'MKUltra Clinical Sedative Vials', 'B3 (Lab Isolation Unit)', 'Brenner / Sam Owens / Infiltration Heist', 'Suppresses psychokinetic abilities or shields delegates from mind links.'),
    ('EVD-11', 'Technical', 'Analog Wall-of-Lights Frequency Log', 'D12 (Byers House)', 'Joyce Byers / HAM Radio Operator', 'Detects dimensional rift activity 1 cycle before a major gate opening.'),
    ('EVD-12', 'Military', 'Scorched Shell Casing & Burn Pattern', 'K6 (Decayed Bradley''s)', 'Jack Sullivan / HPD Crime Scene Unit', 'Proves deployment of heavy military ordnance in civilian sectors.'),
    ('EVD-13', 'Biological', 'Molted Demogorgon Skin Husk', 'H2 (Gate Alpha Perimeter)', 'Field Search / Bio-Hazard Kit', 'Confirms entity growth stage; grants +1 tracking accuracy against packs.'),
    ('EVD-14', 'Audio', 'Encrypted Russian Transceiver Tape', 'J11 (Starcourt Sub-Level)', 'HPD Subpoena / Intercept Directive', 'Proves subterranean foreign presence beneath commercial infrastructure.'),
    ('EVD-15', 'Document', 'Signed DoE Media Gag Order', 'C6 (Hawkins Post Office)', 'Connie Frazier / Investigative Journalist', 'Suppresses public news releases; delays Public Panic increases by 2 cycles.'),
    ('EVD-16', 'Technical', 'Overclocked Portal Drill Blueprint', 'J10 (Subterranean Facility)', 'Sabotage Unit / Infiltration Directive', 'Allows engineers to disable or overload Soviet portal machinery.'),
    ('EVD-17', 'Physical', 'Broken Subterranean Elevator Keycard', 'D10 (Starcourt Mall)', 'Physical Search / Security Seizure', 'Unlocks direct surface access to secret Soviet subterranean complexes.'),
    ('EVD-18', 'Biological', 'Toxic Spore Cloud Air Filter', 'H3 (Spore Vector Zone)', 'Dr. Sam Owens / Bio Burn Unit', 'Accelerates development of medical shielding against atmospheric contagion.'),
    ('EVD-19', 'Photographic', 'Polaroid of Vecna Mindscape Victim', 'H8 (Creel House Perimeter)', '35mm Camera / Field Recon', 'Confirms Vecna''s psychic curse pattern; unlocks psychological triage option.'),
    ('EVD-20', 'Document', 'Confidential Autopsy Report', 'B8 (HPD Morgue)', 'Chief Jim Hopper / Coroner Access', 'Proves internal organ rupture caused by non-conventional physical forces.'),
    ('EVD-21', 'Chemical', 'High-Purity Industrial Salt Container', 'D12 (Byers Residence)', 'Eleven / Joyce Byers', 'Required fuel asset to build a makeshift sensory deprivation tank.'),
    ('EVD-22', 'Technical', 'Scrambled CB Radio Transceiver', 'F8 (Outer Woods Relay Tower)', 'Kali Prasad / Civilian HAM Operator', 'Intercepts military and police emergency frequency broadcasts.'),
    ('EVD-23', 'Physical', 'Severed Biological Tendril Claw', 'G6 (Rift Boundary Line)', 'Field Combat / Military Ordnance', 'Proves interdimensional organism penetration into Normal Hawkins sectors.'),
    ('EVD-24', 'Document', 'Military Martial Law Lockdown Order', 'Mobile Command Base', 'Lt. Colonel Jack Sullivan', 'Authorizes APC roadblocks and media blackouts across town sectors.'),
    ('EVD-25', 'Biological', 'Corrupted Soil & Groundwater Sample', 'C11 (Lover''s Lake)', 'Soil Sampling Kit / Field Analysis', 'Proves spreading biological contamination in municipal water supplies.'),
    ('EVD-26', 'Document', 'Classified Executive Immunity Decree', 'Washington Dispatch / Field Unit', 'Dr. Martin Brenner', 'Nullifies local law enforcement arrest warrants or legal subpoenas.'),
    ('EVD-27', 'Physical', 'Smashed Rotary Telephone', 'A11 (Wheeler Residence)', 'HPD Investigation / Physical Search', 'Confirms localized electromagnetic surge caused by psychokinetic discharge.'),
    ('EVD-28', 'Technical', 'Portable Electro-Magnetic Compass', 'B2 (Lab Gate Perimeter)', 'Analog Scouting / Field Recon', 'Tracks regional magnetic distortion to locate hidden active rifts.'),
    ('EVD-29', 'Photographic', 'Aerial Reconnaissance Map of Rifts', 'Perimeter Checkpoint', 'U.S. Military Recon / Recon Drone', 'Pinpoints exact coordinates of widening dimensional boundary tears.'),
    ('EVD-30', 'Document', 'Starcourt Mall Sub-Level Structural Blueprint', 'C6 (Hawkins Town Hall)', 'Municipal Subpoena / Infiltration Heist', 'Reveals hidden ventilation shafts bypasses into subterranean bases.')
)
INSERT INTO public.fwc_evidence_items (
  conference_id,
  slug,
  category,
  title,
  starting_location,
  discoverable_by,
  tactical_effect
)
SELECT
  c.id,
  catalog.slug,
  catalog.category,
  catalog.title,
  catalog.starting_location,
  catalog.discoverable_by,
  catalog.tactical_effect
FROM public.conferences c
CROSS JOIN catalog
WHERE c.committee ~* '\yFWC\y'
ON CONFLICT (conference_id, slug) DO UPDATE
SET
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  starting_location = EXCLUDED.starting_location,
  discoverable_by = EXCLUDED.discoverable_by,
  tactical_effect = EXCLUDED.tactical_effect,
  updated_at = now();

ALTER TABLE public.fwc_evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_evidence_sources ENABLE ROW LEVEL SECURITY;

-- Chair / SMT / admin only. No delegate inventory dump (sheet has no secrecy flag).
DROP POLICY IF EXISTS fwc_evidence_items_staff ON public.fwc_evidence_items;
CREATE POLICY fwc_evidence_items_staff
  ON public.fwc_evidence_items
  FOR ALL
  TO authenticated
  USING (
    public.is_staff_user((SELECT auth.uid()))
    AND public.user_can_access_chamber_conference((SELECT auth.uid()), conference_id)
  )
  WITH CHECK (
    public.is_staff_user((SELECT auth.uid()))
    AND public.user_can_access_chamber_conference((SELECT auth.uid()), conference_id)
  );

DROP POLICY IF EXISTS fwc_evidence_sources_staff ON public.fwc_evidence_sources;
CREATE POLICY fwc_evidence_sources_staff
  ON public.fwc_evidence_sources
  FOR ALL
  TO authenticated
  USING (
    public.is_staff_user((SELECT auth.uid()))
    AND public.user_can_access_chamber_conference((SELECT auth.uid()), conference_id)
  )
  WITH CHECK (
    public.is_staff_user((SELECT auth.uid()))
    AND public.user_can_access_chamber_conference((SELECT auth.uid()), conference_id)
  );

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fwc_evidence_items', 'fwc_evidence_sources']
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'supabase_realtime publication missing; skip FWC evidence realtime.';
END
$$;

COMMIT;

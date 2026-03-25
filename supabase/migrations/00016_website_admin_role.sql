-- Website admin: platform operators who create conference events and manage SMT accounts.
-- Bootstrap first admin (once): UPDATE profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE lower(email) = lower('you@org.test') LIMIT 1);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'admin';
  END IF;
END $$;

-- Event + first committee: SMT or website admin (not delegates/chairs).
CREATE OR REPLACE FUNCTION public.create_event_and_committee_as_staff(
  p_event_name text,
  p_event_code text,
  p_session_name text,
  p_committee text,
  p_tagline text,
  p_committee_code text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_conf_id uuid;
  v_ec text;
  v_cc text;
  v_en text;
  v_sn text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_en := trim(p_event_name);
  v_sn := trim(p_session_name);
  v_ec := upper(btrim(regexp_replace(p_event_code, '\s+', '', 'g')));
  v_cc := upper(btrim(p_committee_code));

  IF length(v_en) < 2 THEN
    RAISE EXCEPTION 'conference (event) name must be at least 2 characters';
  END IF;
  IF length(v_sn) < 2 THEN
    RAISE EXCEPTION 'committee session title must be at least 2 characters';
  END IF;
  IF v_ec IS NULL OR length(v_ec) < 4 THEN
    RAISE EXCEPTION 'conference code must be at least 4 characters';
  END IF;
  IF v_cc IS NULL OR length(v_cc) < 4 THEN
    RAISE EXCEPTION 'committee code must be at least 4 characters';
  END IF;

  IF EXISTS (SELECT 1 FROM conference_events e WHERE upper(btrim(e.event_code)) = v_ec) THEN
    RAISE EXCEPTION 'conference code already in use';
  END IF;

  INSERT INTO conference_events (name, tagline, event_code)
  VALUES (v_en, NULLIF(trim(p_tagline), ''), v_ec)
  RETURNING id INTO v_event_id;

  INSERT INTO conferences (event_id, name, committee, tagline, room_code, committee_code)
  VALUES (
    v_event_id,
    v_sn,
    NULLIF(trim(p_committee), ''),
    NULLIF(trim(p_tagline), ''),
    v_cc,
    v_cc
  )
  RETURNING id INTO v_conf_id;

  INSERT INTO timers (conference_id) VALUES (v_conf_id);

  RETURN v_conf_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_conference_event_smt(
  p_id uuid,
  p_name text,
  p_tagline text,
  p_event_code text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_code := upper(btrim(regexp_replace(p_event_code, '\s+', '', 'g')));
  IF v_code IS NULL OR length(v_code) < 4 THEN
    RAISE EXCEPTION 'conference code must be at least 4 characters';
  END IF;

  IF EXISTS (
    SELECT 1 FROM conference_events e
    WHERE upper(btrim(e.event_code)) = v_code AND e.id <> p_id
  ) THEN
    RAISE EXCEPTION 'conference code already in use';
  END IF;

  UPDATE conference_events
  SET
    name = trim(p_name),
    tagline = NULLIF(trim(p_tagline), ''),
    event_code = v_code
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_committee_session_smt(
  p_id uuid,
  p_name text,
  p_committee text,
  p_tagline text,
  p_committee_code text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event uuid;
  v_cc text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT event_id INTO v_event FROM conferences WHERE id = p_id;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'committee not found';
  END IF;

  v_cc := upper(btrim(p_committee_code));
  IF v_cc IS NULL OR length(v_cc) < 4 THEN
    RAISE EXCEPTION 'committee code must be at least 4 characters';
  END IF;

  IF EXISTS (
    SELECT 1 FROM conferences c
    WHERE c.event_id = v_event
      AND upper(btrim(c.committee_code)) = v_cc
      AND c.id <> p_id
  ) THEN
    RAISE EXCEPTION 'committee code already in use for this conference';
  END IF;

  UPDATE conferences
  SET
    name = trim(p_name),
    committee = NULLIF(trim(p_committee), ''),
    tagline = NULLIF(trim(p_tagline), ''),
    committee_code = v_cc,
    room_code = v_cc
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_conference_room_code(
  p_conference_id uuid,
  p_room_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
  v_event uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT event_id INTO v_event FROM conferences WHERE id = p_conference_id;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'conference not found';
  END IF;

  v_norm := NULLIF(upper(btrim(p_room_code)), '');

  IF v_norm IS NOT NULL AND length(v_norm) < 4 THEN
    RAISE EXCEPTION 'committee code must be at least 4 characters';
  END IF;

  IF v_norm IS NOT NULL AND EXISTS (
    SELECT 1 FROM conferences c
    WHERE c.event_id = v_event
      AND upper(btrim(c.committee_code)) = v_norm
      AND c.id <> p_conference_id
  ) THEN
    RAISE EXCEPTION 'committee code already in use for this conference';
  END IF;

  UPDATE conferences
  SET room_code = v_norm, committee_code = v_norm
  WHERE id = p_conference_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_committee_password_hash(conference_id uuid, new_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('chair', 'smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.conferences
  SET committee_password_hash = new_hash
  WHERE id = conference_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_profile_role_by_email(
  p_email text,
  p_role text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_label text;
  uid uuid;
  v_role user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR length(v_email) < 3 OR position('@' IN v_email) < 2 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  v_label := lower(trim(p_role));
  IF v_label NOT IN ('delegate', 'chair', 'smt') THEN
    RAISE EXCEPTION 'role must be delegate, chair, or smt';
  END IF;

  v_role := v_label::user_role;

  SELECT id INTO uid FROM auth.users WHERE lower(trim(email)) = v_email LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'no user with that email';
  END IF;

  IF uid = auth.uid() AND v_role IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'cannot change your own role from the admin dashboard';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid) THEN
    RAISE EXCEPTION 'profile missing for user';
  END IF;

  UPDATE public.profiles
  SET role = v_role, updated_at = now()
  WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_profile_role_by_email(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_role_by_email(text, text) TO authenticated;

-- RLS: treat admin like chair/SMT for platform operations (not vote_items chair-only).
DROP POLICY IF EXISTS "Chairs and SMT can read all profiles" ON profiles;
CREATE POLICY "Chairs and SMT can read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin'))
);

DROP POLICY IF EXISTS "Chairs SMT can manage allocations" ON allocations;
CREATE POLICY "Chairs SMT can manage allocations" ON allocations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin'))
);

DROP POLICY IF EXISTS "Main subs can update resolution" ON resolutions;
CREATE POLICY "Main subs can update resolution" ON resolutions FOR UPDATE USING (
  auth.uid() = ANY(main_submitters) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin'))
);

DROP POLICY IF EXISTS "Timers update chairs" ON timers;
CREATE POLICY "Timers update chairs" ON timers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin'))
);

DROP POLICY IF EXISTS "Timers insert chairs" ON timers;
CREATE POLICY "Timers insert chairs" ON timers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin'))
  );

DROP POLICY IF EXISTS "Chairs SMT manage allocation gate codes" ON allocation_gate_codes;
CREATE POLICY "Chairs SMT manage allocation gate codes" ON allocation_gate_codes
FOR ALL TO authenticated
USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin'))
)
WITH CHECK (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin'))
);

DROP POLICY IF EXISTS "speaker_queue_select" ON speaker_queue_entries;
CREATE POLICY "speaker_queue_select" ON speaker_queue_entries FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin'))
    OR EXISTS (
      SELECT 1 FROM allocations a
      WHERE a.conference_id = speaker_queue_entries.conference_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "speaker_queue_chair_all" ON speaker_queue_entries;
CREATE POLICY "speaker_queue_chair_all" ON speaker_queue_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin')));

DROP POLICY IF EXISTS "roll_call_select" ON roll_call_entries;
CREATE POLICY "roll_call_select" ON roll_call_entries FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin'))
    OR EXISTS (
      SELECT 1 FROM allocations a
      WHERE a.id = roll_call_entries.allocation_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "roll_call_chair_all" ON roll_call_entries;
CREATE POLICY "roll_call_chair_all" ON roll_call_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin')));

DROP POLICY IF EXISTS "dais_select" ON dais_announcements;
CREATE POLICY "dais_select" ON dais_announcements FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin'))
    OR EXISTS (
      SELECT 1 FROM allocations a
      WHERE a.conference_id = dais_announcements.conference_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "dais_insert_chairs" ON dais_announcements;
CREATE POLICY "dais_insert_chairs" ON dais_announcements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin'))
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "dais_delete_chairs" ON dais_announcements;
CREATE POLICY "dais_delete_chairs" ON dais_announcements FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin')));

DROP POLICY IF EXISTS "award_assignments_select" ON award_assignments;
CREATE POLICY "award_assignments_select" ON award_assignments FOR SELECT TO authenticated
  USING (
    recipient_profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin'))
  );

DROP POLICY IF EXISTS "award_assignments_insert" ON award_assignments;
CREATE POLICY "award_assignments_insert" ON award_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin')));

DROP POLICY IF EXISTS "award_assignments_update" ON award_assignments;
CREATE POLICY "award_assignments_update" ON award_assignments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin')));

DROP POLICY IF EXISTS "award_assignments_delete" ON award_assignments;
CREATE POLICY "award_assignments_delete" ON award_assignments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin')));

-- SMT or website admin may promote an existing account to chair.
CREATE OR REPLACE FUNCTION public.smt_promote_to_chair_by_email(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  uid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR length(v_email) < 3 OR position('@' IN v_email) < 2 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  SELECT id INTO uid FROM auth.users WHERE lower(trim(email)) = v_email LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'no user with that email';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid) THEN
    RAISE EXCEPTION 'profile missing for user';
  END IF;

  UPDATE public.profiles
  SET role = 'chair'::user_role, updated_at = now()
  WHERE id = uid;
END;
$$;

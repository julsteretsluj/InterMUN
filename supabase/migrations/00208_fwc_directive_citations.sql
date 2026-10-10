-- Structured powers/assets cited on FWC directives.
-- Each entry is {"allocation_id": uuid, "key": text}; keys come from the character sheets
-- in lib/rop/fwc-seamun-i-2027.ts (characters[].powers / characters[].assets).
-- character_power / assets stay as readable summaries for the evaluation prompt and history.

ALTER TABLE public.fwc_directives
  ADD COLUMN IF NOT EXISTS invoked_powers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS invoked_assets jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.fwc_directives
  DROP CONSTRAINT IF EXISTS fwc_directives_invoked_powers_array,
  ADD CONSTRAINT fwc_directives_invoked_powers_array CHECK (jsonb_typeof(invoked_powers) = 'array'),
  DROP CONSTRAINT IF EXISTS fwc_directives_invoked_assets_array,
  ADD CONSTRAINT fwc_directives_invoked_assets_array CHECK (jsonb_typeof(invoked_assets) = 'array');

-- Floor-passed cabinet directives spend their cited powers.
CREATE OR REPLACE FUNCTION private.fwc_on_vote_item_outcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d record;
  v_event uuid;
  v_grp text;
BEGIN
  IF NEW.outcome IS NULL OR NEW.outcome IS NOT DISTINCT FROM OLD.outcome THEN
    RETURN NEW;
  END IF;

  FOR d IN
    SELECT id, conference_id, approval_status, invoked_powers FROM public.fwc_directives
    WHERE vote_item_id = NEW.id AND approval_status = 'on_floor'
  LOOP
    UPDATE public.fwc_directives
    SET
      approval_status = CASE WHEN NEW.outcome = 'passed' THEN 'approved' ELSE 'rejected' END,
      floor_outcome = NEW.outcome,
      reviewed_at = now(),
      updated_at = now()
    WHERE id = d.id;
    INSERT INTO public.fwc_directive_events (directive_id, conference_id, action, from_status, to_status, note, actor_role)
    VALUES (
      d.id, d.conference_id, 'floor_result', 'on_floor',
      CASE WHEN NEW.outcome = 'passed' THEN 'approved' ELSE 'rejected' END,
      'Floor vote ' || NEW.outcome, 'system'
    );
    -- Cited powers are spent when the directive passes (approval), never on submit.
    IF NEW.outcome = 'passed' THEN
      INSERT INTO public.fwc_power_uses
        (conference_id, allocation_id, power_key, crisis_day, crisis_session, mod_caucus_index, directive_id)
      SELECT
        d.conference_id,
        (p->>'allocation_id')::uuid,
        p->>'key',
        COALESCE(st.crisis_day, 1),
        COALESCE(st.crisis_session, 1),
        COALESCE(st.mod_caucus_count, 0),
        d.id
      FROM jsonb_array_elements(COALESCE(d.invoked_powers, '[]'::jsonb)) AS p
      LEFT JOIN public.fwc_session_state st ON st.conference_id = d.conference_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.fwc_power_uses u
        WHERE u.directive_id = d.id
          AND u.power_key = p->>'key'
          AND u.allocation_id = (p->>'allocation_id')::uuid
          AND NOT u.voided
      );
    END IF;
  END LOOP;

  IF NEW.outcome = 'passed' AND NEW.procedure_code = 'moderated_caucus' THEN
    SELECT c.event_id, public.committee_session_group_key(c.committee) INTO v_event, v_grp
    FROM public.conferences c WHERE c.id = NEW.conference_id;
    UPDATE public.fwc_session_state st
    SET mod_caucus_count = st.mod_caucus_count + 1, updated_at = now()
    FROM public.conferences c
    WHERE c.id = st.conference_id
      AND (st.conference_id = NEW.conference_id
        OR (v_grp IS NOT NULL AND c.event_id = v_event AND public.committee_session_group_key(c.committee) = v_grp));
  END IF;
  RETURN NEW;
END;
$$;

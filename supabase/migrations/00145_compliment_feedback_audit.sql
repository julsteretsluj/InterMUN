BEGIN;

CREATE TABLE IF NOT EXISTS public.compliment_flag_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  state_key text NOT NULL,
  payload_before jsonb,
  payload_after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.delegate_chair_feedback_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id uuid NOT NULL REFERENCES public.award_participation_scores(id) ON DELETE CASCADE,
  committee_conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  operation text NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  rubric_scores_before jsonb,
  rubric_scores_after jsonb,
  evidence_before text,
  evidence_after text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliment_flag_audit_conf_created
  ON public.compliment_flag_audit_events (conference_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delegate_feedback_audit_conf_created
  ON public.delegate_chair_feedback_audit_events (committee_conference_id, created_at DESC);

ALTER TABLE public.compliment_flag_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegate_chair_feedback_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliment_flag_audit_select_staff ON public.compliment_flag_audit_events
FOR SELECT TO authenticated
USING (public.is_staff_user(auth.uid()));

CREATE POLICY delegate_feedback_audit_select_staff ON public.delegate_chair_feedback_audit_events
FOR SELECT TO authenticated
USING (public.is_staff_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.audit_digital_room_flags_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.state_key = 'digital_room_flags' THEN
    INSERT INTO public.compliment_flag_audit_events (
      conference_id,
      actor_profile_id,
      state_key,
      payload_before,
      payload_after
    ) VALUES (
      NEW.conference_id,
      auth.uid(),
      NEW.state_key,
      OLD.payload,
      NEW.payload
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_digital_room_flags_state ON public.committee_synced_state;
CREATE TRIGGER trg_audit_digital_room_flags_state
AFTER UPDATE ON public.committee_synced_state
FOR EACH ROW EXECUTE FUNCTION public.audit_digital_room_flags_state();

CREATE OR REPLACE FUNCTION public.audit_delegate_chair_feedback_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.scope = 'chair_by_delegate' THEN
    INSERT INTO public.delegate_chair_feedback_audit_events (
      score_id,
      committee_conference_id,
      actor_profile_id,
      operation,
      rubric_scores_after,
      evidence_after
    ) VALUES (
      NEW.id,
      NEW.committee_conference_id,
      auth.uid(),
      'insert',
      NEW.rubric_scores,
      NEW.evidence_statement
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.scope = 'chair_by_delegate' THEN
    INSERT INTO public.delegate_chair_feedback_audit_events (
      score_id,
      committee_conference_id,
      actor_profile_id,
      operation,
      rubric_scores_before,
      rubric_scores_after,
      evidence_before,
      evidence_after
    ) VALUES (
      NEW.id,
      NEW.committee_conference_id,
      auth.uid(),
      'update',
      OLD.rubric_scores,
      NEW.rubric_scores,
      OLD.evidence_statement,
      NEW.evidence_statement
    );
  ELSIF TG_OP = 'DELETE' AND OLD.scope = 'chair_by_delegate' THEN
    INSERT INTO public.delegate_chair_feedback_audit_events (
      score_id,
      committee_conference_id,
      actor_profile_id,
      operation,
      rubric_scores_before,
      evidence_before
    ) VALUES (
      OLD.id,
      OLD.committee_conference_id,
      auth.uid(),
      'delete',
      OLD.rubric_scores,
      OLD.evidence_statement
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_delegate_chair_feedback_scores ON public.award_participation_scores;
CREATE TRIGGER trg_audit_delegate_chair_feedback_scores
AFTER INSERT OR UPDATE OR DELETE ON public.award_participation_scores
FOR EACH ROW EXECUTE FUNCTION public.audit_delegate_chair_feedback_scores();

COMMIT;

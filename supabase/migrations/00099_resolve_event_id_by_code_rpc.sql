-- Allow pre-auth login wizard to validate conference code without exposing conference_events rows to anon SELECT.
CREATE OR REPLACE FUNCTION public.resolve_conference_event_id_by_code(p_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.conference_events e
  WHERE upper(regexp_replace(btrim(e.event_code), '\s', '', 'g'))
        = upper(regexp_replace(btrim(COALESCE(p_code, '')), '\s', '', 'g'))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_conference_event_id_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_conference_event_id_by_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_conference_event_id_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_conference_event_id_by_code(text) TO service_role;

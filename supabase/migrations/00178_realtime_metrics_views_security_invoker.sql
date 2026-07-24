BEGIN;

ALTER VIEW public.realtime_note_outbox_health
  SET (security_invoker = true);

ALTER VIEW public.realtime_delivery_status_counts
  SET (security_invoker = true);

COMMIT;

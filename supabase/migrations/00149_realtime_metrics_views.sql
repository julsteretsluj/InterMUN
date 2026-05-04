BEGIN;

CREATE OR REPLACE VIEW public.realtime_note_outbox_health AS
SELECT
  conference_id,
  count(*) FILTER (WHERE published = false) AS queued_events,
  count(*) FILTER (WHERE published = true) AS published_events,
  max(created_at) FILTER (WHERE published = false) AS oldest_queued_at,
  max(published_at) FILTER (WHERE published = true) AS latest_published_at
FROM public.note_outbox
GROUP BY conference_id;

CREATE OR REPLACE VIEW public.realtime_delivery_status_counts AS
SELECT
  m.conference_id,
  r.delivery_status,
  count(*) AS status_count,
  max(r.updated_at) AS latest_status_at
FROM public.note_delivery_receipts r
JOIN public.note_messages m ON m.id = r.message_id
GROUP BY m.conference_id, r.delivery_status;

GRANT SELECT ON public.realtime_note_outbox_health TO authenticated;
GRANT SELECT ON public.realtime_delivery_status_counts TO authenticated;

COMMIT;

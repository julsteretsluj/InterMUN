-- Allow chairs to tag end-of-session SMT updates.

ALTER TABLE public.delegation_notes
  DROP CONSTRAINT IF EXISTS delegation_notes_topic_check;

ALTER TABLE public.delegation_notes
  ADD CONSTRAINT delegation_notes_topic_check
  CHECK (
    topic IN (
      'bloc forming',
      'speech pois or pocs',
      'questions',
      'informal conversations',
      'session progress'
    )
  );

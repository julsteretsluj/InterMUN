-- Covering indexes for foreign keys flagged by Supabase lint 0001_unindexed_foreign_keys.
-- Speeds up joins, cascading lookups, and ON DELETE/UPDATE checks.

BEGIN;

CREATE INDEX IF NOT EXISTS allocation_signup_requests_allocation_id_idx
  ON public.allocation_signup_requests (allocation_id);
CREATE INDEX IF NOT EXISTS allocation_signup_requests_requested_by_idx
  ON public.allocation_signup_requests (requested_by);
CREATE INDEX IF NOT EXISTS allocation_signup_requests_reviewed_by_idx
  ON public.allocation_signup_requests (reviewed_by);

CREATE INDEX IF NOT EXISTS allocations_user_id_idx
  ON public.allocations (user_id);

CREATE INDEX IF NOT EXISTS amendments_reviewed_by_idx
  ON public.amendments (reviewed_by);
CREATE INDEX IF NOT EXISTS amendments_submitted_by_idx
  ON public.amendments (submitted_by);
CREATE INDEX IF NOT EXISTS amendments_submitter_allocation_id_idx
  ON public.amendments (submitter_allocation_id);

CREATE INDEX IF NOT EXISTS award_assignments_created_by_idx
  ON public.award_assignments (created_by);
CREATE INDEX IF NOT EXISTS award_assignments_recipient_committee_id_idx
  ON public.award_assignments (recipient_committee_id);
CREATE INDEX IF NOT EXISTS award_assignments_recipient_profile_id_idx
  ON public.award_assignments (recipient_profile_id);

CREATE INDEX IF NOT EXISTS award_nominations_created_by_idx
  ON public.award_nominations (created_by);
CREATE INDEX IF NOT EXISTS award_nominations_nominee_profile_id_idx
  ON public.award_nominations (nominee_profile_id);
CREATE INDEX IF NOT EXISTS award_nominations_reviewed_by_idx
  ON public.award_nominations (reviewed_by);
CREATE INDEX IF NOT EXISTS award_nominations_selected_award_assignment_id_idx
  ON public.award_nominations (selected_award_assignment_id);

CREATE INDEX IF NOT EXISTS award_participation_scores_created_by_idx
  ON public.award_participation_scores (created_by);
CREATE INDEX IF NOT EXISTS award_participation_scores_subject_profile_id_idx
  ON public.award_participation_scores (subject_profile_id);

CREATE INDEX IF NOT EXISTS bloc_memberships_user_id_idx
  ON public.bloc_memberships (user_id);

CREATE INDEX IF NOT EXISTS bloc_messages_sender_allocation_id_idx
  ON public.bloc_messages (sender_allocation_id);
CREATE INDEX IF NOT EXISTS bloc_messages_sender_user_id_idx
  ON public.bloc_messages (sender_user_id);

CREATE INDEX IF NOT EXISTS blocs_resolution_id_idx
  ON public.blocs (resolution_id);

CREATE INDEX IF NOT EXISTS chair_delegate_discipline_allocation_id_idx
  ON public.chair_delegate_discipline (allocation_id);

CREATE INDEX IF NOT EXISTS chair_delegate_discipline_events_allocation_id_idx
  ON public.chair_delegate_discipline_events (allocation_id);
CREATE INDEX IF NOT EXISTS chair_delegate_discipline_events_chair_user_id_idx
  ON public.chair_delegate_discipline_events (chair_user_id);

CREATE INDEX IF NOT EXISTS chair_delegate_points_chair_user_id_idx
  ON public.chair_delegate_points (chair_user_id);

CREATE INDEX IF NOT EXISTS chair_session_points_raised_by_allocation_id_idx
  ON public.chair_session_points (raised_by_allocation_id);

CREATE INDEX IF NOT EXISTS chair_speech_notes_allocation_id_idx
  ON public.chair_speech_notes (allocation_id);

CREATE INDEX IF NOT EXISTS chat_messages_sender_id_idx
  ON public.chat_messages (sender_id);

CREATE INDEX IF NOT EXISTS committee_session_history_created_by_idx
  ON public.committee_session_history (created_by);

CREATE INDEX IF NOT EXISTS committee_speech_events_vote_item_id_idx
  ON public.committee_speech_events (vote_item_id);

CREATE INDEX IF NOT EXISTS compliment_flag_audit_events_actor_profile_id_idx
  ON public.compliment_flag_audit_events (actor_profile_id);

CREATE INDEX IF NOT EXISTS conferences_event_id_idx
  ON public.conferences (event_id);

CREATE INDEX IF NOT EXISTS dais_announcements_created_by_idx
  ON public.dais_announcements (created_by);

CREATE INDEX IF NOT EXISTS delegate_chair_feedback_audit_events_actor_profile_id_idx
  ON public.delegate_chair_feedback_audit_events (actor_profile_id);
CREATE INDEX IF NOT EXISTS delegate_chair_feedback_audit_events_score_id_idx
  ON public.delegate_chair_feedback_audit_events (score_id);

CREATE INDEX IF NOT EXISTS delegation_note_moderation_events_actor_profile_id_idx
  ON public.delegation_note_moderation_events (actor_profile_id);

CREATE INDEX IF NOT EXISTS delegation_note_recipients_recipient_allocation_id_idx
  ON public.delegation_note_recipients (recipient_allocation_id);
CREATE INDEX IF NOT EXISTS delegation_note_recipients_recipient_profile_id_idx
  ON public.delegation_note_recipients (recipient_profile_id);

CREATE INDEX IF NOT EXISTS delegation_note_reports_chair_profile_id_idx
  ON public.delegation_note_reports (chair_profile_id);
CREATE INDEX IF NOT EXISTS delegation_note_reports_note_id_idx
  ON public.delegation_note_reports (note_id);

CREATE INDEX IF NOT EXISTS delegation_note_stars_chair_profile_id_idx
  ON public.delegation_note_stars (chair_profile_id);

CREATE INDEX IF NOT EXISTS delegation_note_threads_root_note_id_idx
  ON public.delegation_note_threads (root_note_id);

CREATE INDEX IF NOT EXISTS delegation_notes_forwarded_to_advisor_profile_id_idx
  ON public.delegation_notes (forwarded_to_advisor_profile_id);
CREATE INDEX IF NOT EXISTS delegation_notes_moderated_by_profile_id_idx
  ON public.delegation_notes (moderated_by_profile_id);
CREATE INDEX IF NOT EXISTS delegation_notes_reply_to_note_id_idx
  ON public.delegation_notes (reply_to_note_id);
CREATE INDEX IF NOT EXISTS delegation_notes_sender_allocation_id_idx
  ON public.delegation_notes (sender_allocation_id);
CREATE INDEX IF NOT EXISTS delegation_notes_sender_profile_id_idx
  ON public.delegation_notes (sender_profile_id);

CREATE INDEX IF NOT EXISTS documents_user_id_idx
  ON public.documents (user_id);

CREATE INDEX IF NOT EXISTS ideas_conference_id_idx
  ON public.ideas (conference_id);
CREATE INDEX IF NOT EXISTS ideas_user_id_idx
  ON public.ideas (user_id);

CREATE INDEX IF NOT EXISTS motion_audit_events_actor_profile_id_idx
  ON public.motion_audit_events (actor_profile_id);

CREATE INDEX IF NOT EXISTS note_messages_sender_allocation_id_idx
  ON public.note_messages (sender_allocation_id);
CREATE INDEX IF NOT EXISTS note_messages_sender_profile_id_idx
  ON public.note_messages (sender_profile_id);

CREATE INDEX IF NOT EXISTS note_moderation_events_actor_profile_id_idx
  ON public.note_moderation_events (actor_profile_id);
CREATE INDEX IF NOT EXISTS note_moderation_events_message_id_idx
  ON public.note_moderation_events (message_id);

CREATE INDEX IF NOT EXISTS note_outbox_conference_id_idx
  ON public.note_outbox (conference_id);
CREATE INDEX IF NOT EXISTS note_outbox_message_id_idx
  ON public.note_outbox (message_id);

CREATE INDEX IF NOT EXISTS note_recipients_conference_id_idx
  ON public.note_recipients (conference_id);
CREATE INDEX IF NOT EXISTS note_recipients_recipient_allocation_id_idx
  ON public.note_recipients (recipient_allocation_id);
CREATE INDEX IF NOT EXISTS note_recipients_recipient_profile_id_idx
  ON public.note_recipients (recipient_profile_id);

CREATE INDEX IF NOT EXISTS note_threads_created_by_idx
  ON public.note_threads (created_by);

CREATE INDEX IF NOT EXISTS notes_allocation_id_idx
  ON public.notes (allocation_id);
CREATE INDEX IF NOT EXISTS notes_conference_id_idx
  ON public.notes (conference_id);
CREATE INDEX IF NOT EXISTS notes_user_id_idx
  ON public.notes (user_id);

CREATE INDEX IF NOT EXISTS procedure_states_current_vote_item_id_idx
  ON public.procedure_states (current_vote_item_id);

CREATE INDEX IF NOT EXISTS profiles_smt_chair_conference_id_idx
  ON public.profiles (smt_chair_conference_id);
CREATE INDEX IF NOT EXISTS profiles_smt_delegate_allocation_id_idx
  ON public.profiles (smt_delegate_allocation_id);

CREATE INDEX IF NOT EXISTS realtime_feature_flags_updated_by_idx
  ON public.realtime_feature_flags (updated_by);

CREATE INDEX IF NOT EXISTS reports_user_id_idx
  ON public.reports (user_id);

CREATE INDEX IF NOT EXISTS resolution_clause_suggestions_conference_id_idx
  ON public.resolution_clause_suggestions (conference_id);
CREATE INDEX IF NOT EXISTS resolution_clause_suggestions_created_by_idx
  ON public.resolution_clause_suggestions (created_by);

CREATE INDEX IF NOT EXISTS resolution_clause_vote_outcomes_clause_id_idx
  ON public.resolution_clause_vote_outcomes (clause_id);

CREATE INDEX IF NOT EXISTS resolution_clauses_conference_id_idx
  ON public.resolution_clauses (conference_id);
CREATE INDEX IF NOT EXISTS resolution_clauses_created_by_idx
  ON public.resolution_clauses (created_by);

CREATE INDEX IF NOT EXISTS resolutions_conference_id_idx
  ON public.resolutions (conference_id);
CREATE INDEX IF NOT EXISTS resolutions_finalized_by_idx
  ON public.resolutions (finalized_by);

CREATE INDEX IF NOT EXISTS roll_call_entries_allocation_id_idx
  ON public.roll_call_entries (allocation_id);

CREATE INDEX IF NOT EXISTS signatory_requests_resolution_id_idx
  ON public.signatory_requests (resolution_id);
CREATE INDEX IF NOT EXISTS signatory_requests_user_id_idx
  ON public.signatory_requests (user_id);

CREATE INDEX IF NOT EXISTS sources_user_id_idx
  ON public.sources (user_id);

CREATE INDEX IF NOT EXISTS speaker_queue_entries_allocation_id_idx
  ON public.speaker_queue_entries (allocation_id);

CREATE INDEX IF NOT EXISTS speeches_conference_id_idx
  ON public.speeches (conference_id);
CREATE INDEX IF NOT EXISTS speeches_user_id_idx
  ON public.speeches (user_id);

CREATE INDEX IF NOT EXISTS timer_pause_events_created_by_idx
  ON public.timer_pause_events (created_by);

CREATE INDEX IF NOT EXISTS user_notifications_conference_id_idx
  ON public.user_notifications (conference_id);

CREATE INDEX IF NOT EXISTS vote_items_procedure_resolution_id_idx
  ON public.vote_items (procedure_resolution_id);

CREATE INDEX IF NOT EXISTS vote_rights_statements_user_id_idx
  ON public.vote_rights_statements (user_id);

CREATE INDEX IF NOT EXISTS votes_allocation_id_idx
  ON public.votes (allocation_id);
CREATE INDEX IF NOT EXISTS votes_user_id_idx
  ON public.votes (user_id);

COMMIT;

-- School on profile (for placards / delegate identification)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school TEXT;

-- Delegates can read basic profile fields of anyone sharing a conference allocation (committee room placards)
CREATE POLICY "Delegates can read co-delegate profiles in same conference" ON profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM allocations a_self
    JOIN allocations a_peer ON a_self.conference_id = a_peer.conference_id
    WHERE a_self.user_id = auth.uid()
      AND a_peer.user_id = profiles.id
  )
);

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User roles enum
CREATE TYPE user_role AS ENUM ('delegate', 'chair', 'smt');

-- Vote type enum
CREATE TYPE vote_type AS ENUM ('motion', 'amendment', 'resolution');

-- Vote value enum
CREATE TYPE vote_value AS ENUM ('yes', 'no', 'abstain');

-- Bloc stance enum
CREATE TYPE bloc_stance AS ENUM ('for', 'against');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'delegate',
  name TEXT,
  pronouns TEXT,
  profile_picture_url TEXT,
  conferences_attended INTEGER DEFAULT 0,
  awards TEXT[] DEFAULT '{}',
  allocation TEXT,
  stance_overview JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conferences
CREATE TABLE conferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  committee TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allocations (country/position per conference)
CREATE TABLE allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  UNIQUE(conference_id, user_id)
);

-- Timers (current speaker, next speaker, time)
CREATE TABLE timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
  current_speaker TEXT,
  next_speaker TEXT,
  time_left_seconds INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vote items (motions, amendments, resolutions - what is being voted on)
CREATE TABLE vote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
  vote_type vote_type NOT NULL,
  title TEXT,
  description TEXT,
  must_vote BOOLEAN DEFAULT false,
  required_majority TEXT DEFAULT 'simple',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_item_id UUID REFERENCES vote_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  value vote_value NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vote_item_id, user_id)
);

-- Notes (chats, running notes, stance notes)
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  conference_id UUID REFERENCES conferences(id) ON DELETE SET NULL,
  allocation_id UUID REFERENCES allocations(id) ON DELETE SET NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('chat', 'running', 'stance')),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resolutions
CREATE TABLE resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
  google_docs_url TEXT,
  main_submitters UUID[] DEFAULT '{}',
  co_submitters UUID[] DEFAULT '{}',
  signatories UUID[] DEFAULT '{}',
  visible_to_other_bloc BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocs (per resolution)
CREATE TABLE blocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_id UUID REFERENCES resolutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stance bloc_stance NOT NULL
);

-- Bloc memberships
CREATE TABLE bloc_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloc_id UUID REFERENCES blocs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(bloc_id, user_id)
);

-- Signatory requests (virtual sign - notifies main subs)
CREATE TABLE signatory_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_id UUID REFERENCES resolutions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'added', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Speeches
CREATE TABLE speeches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  conference_id UUID REFERENCES conferences(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ideas (resolution ideas)
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  conference_id UUID REFERENCES conferences(id) ON DELETE SET NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources (trusted links)
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (position paper, prep doc)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('position_paper', 'prep_doc')),
  title TEXT,
  content TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports (AI use, inappropriate conduct)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('ai_use', 'inappropriate_conduct')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guides (RoP, examples, templates - stored as markdown)
CREATE TABLE guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloc_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatory_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE speeches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read own, chairs/smt can read all
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Chairs and SMT can read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt'))
);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Conferences: all authenticated can read
CREATE POLICY "Authenticated can read conferences" ON conferences FOR SELECT TO authenticated USING (true);

-- Allocations: all authenticated can read
CREATE POLICY "Authenticated can read allocations" ON allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Chairs SMT can manage allocations" ON allocations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt'))
);

-- Notes: own notes only (or chairs can see)
CREATE POLICY "Users can manage own notes" ON notes FOR ALL USING (auth.uid() = user_id);

-- Votes: authenticated can read/write own votes
CREATE POLICY "Authenticated can read vote_items" ON vote_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read votes" ON votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own vote" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Chairs can manage vote_items" ON vote_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'chair')
);

-- Similar policies for other tables - simplified for MVP
CREATE POLICY "Authenticated read resolutions" ON resolutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert resolutions" ON resolutions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Main subs can update resolution" ON resolutions FOR UPDATE USING (
  auth.uid() = ANY(main_submitters) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt'))
);

CREATE POLICY "Users manage own speeches" ON speeches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own ideas" ON ideas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own sources" ON sources FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own documents" ON documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own reports" ON reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Authenticated read guides" ON guides FOR SELECT TO authenticated USING (true);

CREATE POLICY "Signatory requests" ON signatory_requests FOR ALL TO authenticated USING (true);
CREATE POLICY "Blocs policies" ON blocs FOR ALL TO authenticated USING (true);
CREATE POLICY "Bloc memberships" ON bloc_memberships FOR ALL TO authenticated USING (true);
CREATE POLICY "Timers read" ON timers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Timers update chairs" ON timers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt'))
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

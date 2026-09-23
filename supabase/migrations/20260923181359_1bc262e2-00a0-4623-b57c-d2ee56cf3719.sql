CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL UNIQUE,
  display_term TEXT NOT NULL,
  word_class TEXT,
  meaning TEXT NOT NULL,
  other_meanings JSONB NOT NULL DEFAULT '[]'::jsonb,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  synonyms JSONB NOT NULL DEFAULT '[]'::jsonb,
  antonyms JSONB NOT NULL DEFAULT '[]'::jsonb,
  polysemy TEXT,
  context_note TEXT,
  regional_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.words TO authenticated;
GRANT SELECT ON public.words TO anon;
GRANT ALL ON public.words TO service_role;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "words_readable" ON public.words FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocabulary TO authenticated;
GRANT ALL ON public.vocabulary TO service_role;
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vocabulary_own" ON public.vocabulary FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  term TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.search_history TO authenticated;
GRANT ALL ON public.search_history TO service_role;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_history_own" ON public.search_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  word_id UUID REFERENCES public.words(id) ON DELETE SET NULL,
  term TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_own" ON public.reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_vocabulary_user ON public.vocabulary(user_id, created_at DESC);
CREATE INDEX idx_search_history_user ON public.search_history(user_id, created_at DESC);
CREATE INDEX idx_reviews_user ON public.reviews(user_id, created_at DESC);
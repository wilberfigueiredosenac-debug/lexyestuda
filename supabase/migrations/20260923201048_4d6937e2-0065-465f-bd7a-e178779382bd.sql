ALTER TABLE public.vocabulary ADD COLUMN play_count integer NOT NULL DEFAULT 0, ADD COLUMN last_played_at timestamptz;

CREATE TABLE public.pronunciation_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id uuid REFERENCES public.words(id) ON DELETE SET NULL,
  term text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.pronunciation_plays TO authenticated;
GRANT ALL ON public.pronunciation_plays TO service_role;
ALTER TABLE public.pronunciation_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plays" ON public.pronunciation_plays FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.pronunciation_plays (user_id, created_at DESC);

CREATE TABLE public.study_goals (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_target integer NOT NULL DEFAULT 5 CHECK (daily_target BETWEEN 1 AND 100),
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_time time NOT NULL DEFAULT '18:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.study_goals TO authenticated;
GRANT ALL ON public.study_goals TO service_role;
ALTER TABLE public.study_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.study_goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.study_activity (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
GRANT SELECT, INSERT, UPDATE ON public.study_activity TO authenticated;
GRANT ALL ON public.study_activity TO service_role;
ALTER TABLE public.study_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity" ON public.study_activity FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.log_study(_day date, _amount integer DEFAULT 1)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  INSERT INTO public.study_activity (user_id, day, count) VALUES (auth.uid(), _day, GREATEST(_amount,1))
  ON CONFLICT (user_id, day) DO UPDATE SET count = study_activity.count + GREATEST(_amount,1);
$$;

CREATE OR REPLACE FUNCTION public.log_pronunciation(_word_id uuid, _term text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  INSERT INTO public.pronunciation_plays (user_id, word_id, term) VALUES (auth.uid(), _word_id, _term);
  UPDATE public.vocabulary SET play_count = play_count + 1, last_played_at = now()
    WHERE user_id = auth.uid() AND word_id = _word_id;
$$;
GRANT EXECUTE ON FUNCTION public.log_study(date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_pronunciation(uuid, text) TO authenticated;
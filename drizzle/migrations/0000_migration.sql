DROP POLICY IF EXISTS words_readable ON public.words;
REVOKE SELECT ON public.words FROM anon;
CREATE POLICY words_read_saved ON public.words FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.vocabulary v WHERE v.word_id = words.id AND v.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.reviews r WHERE r.word_id = words.id AND r.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.pronunciation_plays p WHERE p.word_id = words.id AND p.user_id = auth.uid())
);
ALTER TABLE public.study_goals
  ADD COLUMN IF NOT EXISTS email_reminder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Cuiaba',
  ADD COLUMN IF NOT EXISTS last_email_sent_on date;
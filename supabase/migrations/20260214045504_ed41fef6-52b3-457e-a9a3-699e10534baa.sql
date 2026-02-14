
-- Create enums for university
CREATE TYPE public.university_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.university_level AS ENUM ('iniciante', 'intermediario', 'avancado');

-- Table: university_modules
CREATE TABLE public.university_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  order_position INTEGER NOT NULL DEFAULT 0,
  status public.university_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.university_modules ENABLE ROW LEVEL SECURITY;

-- Masters/admins can manage modules
CREATE POLICY "Admins can manage modules"
  ON public.university_modules FOR ALL
  USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view published modules
CREATE POLICY "Users can view published modules"
  ON public.university_modules FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'published');

-- Table: university_lessons
CREATE TABLE public.university_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.university_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  level public.university_level NOT NULL DEFAULT 'iniciante',
  reading_time INTEGER NOT NULL DEFAULT 5,
  cover_image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  order_position INTEGER NOT NULL DEFAULT 0,
  status public.university_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.university_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lessons"
  ON public.university_lessons FOR ALL
  USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view published lessons"
  ON public.university_lessons FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND status = 'published'
    AND module_id IN (SELECT id FROM public.university_modules WHERE status = 'published')
  );

-- Table: user_lesson_progress
CREATE TABLE public.user_lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.university_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own progress"
  ON public.user_lesson_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_university_modules_updated_at
  BEFORE UPDATE ON public.university_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_university_lessons_updated_at
  BEFORE UPDATE ON public.university_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_university_lessons_module_id ON public.university_lessons(module_id);
CREATE INDEX idx_university_lessons_slug ON public.university_lessons(slug);
CREATE INDEX idx_user_lesson_progress_user ON public.user_lesson_progress(user_id);
CREATE INDEX idx_user_lesson_progress_lesson ON public.user_lesson_progress(lesson_id);

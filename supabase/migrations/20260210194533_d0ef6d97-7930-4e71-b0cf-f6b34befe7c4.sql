
-- Help content table for the advanced help system
CREATE TABLE public.help_content (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  screen TEXT,
  feature TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  example TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  link_to TEXT,
  content_version TEXT NOT NULL DEFAULT '1.0.0',
  system_version_required TEXT NOT NULL DEFAULT '>=1.0.0',
  needs_review BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.help_content ENABLE ROW LEVEL SECURITY;

-- Help content is read-only for all authenticated users
CREATE POLICY "Help content is readable by authenticated users"
  ON public.help_content
  FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true AND needs_review = false);

-- Only master users can manage help content (via admin panel)
CREATE POLICY "Master users can manage help content"
  ON public.help_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'master'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'master'
    )
  );

-- Index for screen-based contextual queries
CREATE INDEX idx_help_content_screen ON public.help_content(screen) WHERE is_active = true AND needs_review = false;

-- Index for category filtering
CREATE INDEX idx_help_content_category ON public.help_content(category) WHERE is_active = true AND needs_review = false;

-- GIN index for tag search
CREATE INDEX idx_help_content_tags ON public.help_content USING GIN(tags) WHERE is_active = true AND needs_review = false;

-- Trigger for updated_at
CREATE TRIGGER update_help_content_updated_at
  BEFORE UPDATE ON public.help_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

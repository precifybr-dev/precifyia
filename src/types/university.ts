export type UniversityStatus = 'draft' | 'published' | 'archived';
export type UniversityLevel = 'iniciante' | 'intermediario' | 'avancado';

export interface UniversityModule {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  order_position: number;
  status: UniversityStatus;
  created_at: string;
  updated_at: string;
}

export interface UniversityLesson {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  short_description: string;
  content: string;
  level: UniversityLevel;
  reading_time: number;
  cover_image_url: string | null;
  is_featured: boolean;
  order_position: number;
  status: UniversityStatus;
  created_at: string;
  updated_at: string;
}

export interface UserLessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  last_accessed_at: string;
}

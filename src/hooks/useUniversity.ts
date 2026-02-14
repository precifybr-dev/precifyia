import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { UniversityModule, UniversityLesson, UserLessonProgress } from "@/types/university";

export function useUniversityModules(adminMode = false) {
  const [modules, setModules] = useState<UniversityModule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchModules = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("university_modules" as any)
      .select("*")
      .order("order_position", { ascending: true });

    if (!adminMode) {
      query = query.eq("status", "published");
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: "Erro ao carregar módulos", description: error.message, variant: "destructive" });
    } else {
      setModules((data as any) || []);
    }
    setLoading(false);
  }, [adminMode, toast]);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const saveModule = async (mod: Partial<UniversityModule> & { id?: string }) => {
    if (mod.id) {
      const { error } = await supabase.from("university_modules" as any).update(mod as any).eq("id", mod.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("university_modules" as any).insert(mod as any);
      if (error) throw error;
    }
    await fetchModules();
  };

  const deleteModule = async (id: string) => {
    const { error } = await supabase.from("university_modules" as any).delete().eq("id", id);
    if (error) throw error;
    await fetchModules();
  };

  return { modules, loading, fetchModules, saveModule, deleteModule };
}

export function useUniversityLessons(moduleId?: string, adminMode = false) {
  const [lessons, setLessons] = useState<UniversityLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLessons = useCallback(async () => {
    if (!moduleId) { setLessons([]); setLoading(false); return; }
    setLoading(true);
    let query = supabase
      .from("university_lessons" as any)
      .select("*")
      .eq("module_id", moduleId)
      .order("order_position", { ascending: true });

    if (!adminMode) {
      query = query.eq("status", "published");
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: "Erro ao carregar aulas", description: error.message, variant: "destructive" });
    } else {
      setLessons((data as any) || []);
    }
    setLoading(false);
  }, [moduleId, adminMode, toast]);

  useEffect(() => { fetchLessons(); }, [fetchLessons]);

  const saveLesson = async (lesson: Partial<UniversityLesson> & { id?: string }) => {
    const slug = lesson.slug || generateSlug(lesson.title || "");
    const payload = { ...lesson, slug };
    if (lesson.id) {
      const { error } = await supabase.from("university_lessons" as any).update(payload as any).eq("id", lesson.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("university_lessons" as any).insert(payload as any);
      if (error) throw error;
    }
    await fetchLessons();
  };

  const deleteLesson = async (id: string) => {
    const { error } = await supabase.from("university_lessons" as any).delete().eq("id", id);
    if (error) throw error;
    await fetchLessons();
  };

  return { lessons, loading, fetchLessons, saveLesson, deleteLesson };
}

export function useUserProgress() {
  const [progress, setProgress] = useState<UserLessonProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data } = await supabase
      .from("user_lesson_progress" as any)
      .select("*")
      .eq("user_id", session.user.id);

    setProgress((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const toggleComplete = async (lessonId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const existing = progress.find(p => p.lesson_id === lessonId);
    if (existing) {
      const newCompleted = !existing.completed;
      await supabase
        .from("user_lesson_progress" as any)
        .update({
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
          last_accessed_at: new Date().toISOString(),
        } as any)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("user_lesson_progress" as any)
        .insert({
          user_id: session.user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        } as any);
    }
    await fetchProgress();
  };

  const markAccessed = async (lessonId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const existing = progress.find(p => p.lesson_id === lessonId);
    if (existing) {
      await supabase
        .from("user_lesson_progress" as any)
        .update({ last_accessed_at: new Date().toISOString() } as any)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("user_lesson_progress" as any)
        .insert({
          user_id: session.user.id,
          lesson_id: lessonId,
          completed: false,
          last_accessed_at: new Date().toISOString(),
        } as any);
    }
  };

  return { progress, loading, fetchProgress, toggleComplete, markAccessed };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

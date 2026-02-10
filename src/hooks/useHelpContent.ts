import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isVersionCompatible } from "@/lib/system-version";
import { normalizeText } from "@/lib/utils";
import { SCREEN_MAP } from "@/lib/help-categories";
import { useLocation } from "react-router-dom";

export interface HelpItem {
  id: string;
  category: string;
  screen: string | null;
  feature: string | null;
  title: string;
  description: string;
  example: string | null;
  tags: string[];
  image_url: string | null;
  link_to: string | null;
  content_version: string;
  system_version_required: string;
  sort_order: number;
}

export function useHelpContent() {
  const [items, setItems] = useState<HelpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchHelp = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("help_content")
      .select("id, category, screen, feature, title, description, example, tags, image_url, link_to, content_version, system_version_required, sort_order")
      .eq("is_active", true)
      .eq("needs_review", false)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      // Filter by system version compatibility on client
      const compatible = data.filter((item: any) =>
        isVersionCompatible(item.system_version_required)
      );
      setItems(compatible);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHelp();
  }, [fetchHelp]);

  const filteredItems = useMemo(() => {
    let result = items;

    if (selectedCategory) {
      result = result.filter(i => i.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const normalized = normalizeText(searchQuery.trim());
      result = result.filter(item => {
        const inTitle = normalizeText(item.title).includes(normalized);
        const inDesc = normalizeText(item.description).includes(normalized);
        const inTags = item.tags.some(t => normalizeText(t).includes(normalized));
        const inExample = item.example ? normalizeText(item.example).includes(normalized) : false;
        return inTitle || inDesc || inTags || inExample;
      });
    }

    return result;
  }, [items, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(item => {
      map.set(item.category, (map.get(item.category) || 0) + 1);
    });
    return map;
  }, [items]);

  return {
    items: filteredItems,
    allItems: items,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    refetch: fetchHelp,
  };
}

/**
 * Hook para ajuda contextual — retorna FAQs relevantes para a tela atual.
 */
export function useContextualHelp() {
  const location = useLocation();
  const [items, setItems] = useState<HelpItem[]>([]);
  const [loading, setLoading] = useState(false);

  const screenId = SCREEN_MAP[location.pathname] || null;

  useEffect(() => {
    if (!screenId) {
      setItems([]);
      return;
    }

    const fetchContextual = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("help_content")
        .select("id, category, screen, feature, title, description, example, tags, image_url, link_to, content_version, system_version_required, sort_order")
        .eq("is_active", true)
        .eq("needs_review", false)
        .eq("screen", screenId)
        .order("sort_order", { ascending: true });

      if (data) {
        const compatible = data.filter((item: any) =>
          isVersionCompatible(item.system_version_required)
        );
        setItems(compatible);
      }
      setLoading(false);
    };

    fetchContextual();
  }, [screenId]);

  return { items, loading, screenId };
}

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useToast } from "@/hooks/use-toast";

export interface FullMenuItem {
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  position: number;
}

export interface MenuMirrorData {
  storeName: string;
  items: FullMenuItem[];
}

export function useMenuMirror() {
  const { activeStore } = useStore();
  const { toast } = useToast();
  const [menuData, setMenuData] = useState<MenuMirrorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const ifoodUrl = (activeStore as any)?.ifood_url as string | null;

  const fetchMenu = useCallback(async (url?: string) => {
    const targetUrl = url || ifoodUrl;
    if (!targetUrl) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-ifood-menu", {
        body: { ifoodUrl: targetUrl, importType: "full_menu" },
      });

      if (error) throw error;

      if (data?.success && data.items) {
        setMenuData({
          storeName: data.storeName || "Minha Loja",
          items: data.items,
        });
      } else {
        throw new Error(data?.error || "Erro ao buscar cardápio");
      }
    } catch (err: any) {
      console.error("fetchMenu error:", err);
      toast({
        title: "Erro ao carregar cardápio",
        description: err.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [ifoodUrl, toast]);

  const saveIfoodUrl = useCallback(async (url: string) => {
    if (!activeStore?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({ ifood_url: url } as any)
        .eq("id", activeStore.id);

      if (error) throw error;

      toast({
        title: "Link salvo!",
        description: "Seu cardápio será carregado automaticamente.",
      });

      await fetchMenu(url);
    } catch (err: any) {
      console.error("saveIfoodUrl error:", err);
      toast({
        title: "Erro ao salvar link",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [activeStore?.id, fetchMenu, toast]);

  const clearUrl = useCallback(async () => {
    if (!activeStore?.id) return;

    try {
      await supabase
        .from("stores")
        .update({ ifood_url: null } as any)
        .eq("id", activeStore.id);

      setMenuData(null);
      toast({ title: "Link removido" });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [activeStore?.id, toast]);

  return {
    menuData,
    isLoading,
    isSaving,
    ifoodUrl,
    fetchMenu,
    saveIfoodUrl,
    clearUrl,
  };
}

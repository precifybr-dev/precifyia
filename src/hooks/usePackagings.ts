import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useToast } from "@/hooks/use-toast";

export interface PackagingItem {
  id: string;
  packaging_id: string;
  ingredient_id: string | null;
  item_name: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

export interface Packaging {
  id: string;
  user_id: string;
  store_id: string | null;
  name: string;
  type: "simples" | "combo";
  category: string | null;
  description: string | null;
  cost_total: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  packaging_items?: PackagingItem[];
}

export function usePackagings() {
  const { activeStore } = useStore();
  const { toast } = useToast();
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  const fetchPackagings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    let query = supabase
      .from("packagings")
      .select("*, packaging_items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (activeStore?.id) {
      query = query.eq("store_id", activeStore.id);
    } else {
      query = query.is("store_id", null);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Erro", description: "Não foi possível carregar embalagens", variant: "destructive" });
    } else {
      setPackagings((data as any) || []);
    }
    setLoading(false);
  }, [userId, activeStore?.id, toast]);

  useEffect(() => {
    if (userId) fetchPackagings();
  }, [userId, activeStore?.id, fetchPackagings]);

  const createPackaging = async (data: {
    name: string;
    type?: "simples" | "combo";
    category?: string;
    description?: string;
    cost_total?: number;
    items?: { ingredient_id?: string; item_name: string; quantity: number; unit_cost: number }[];
  }) => {
    if (!userId) return null;

    const hasItems = data.items && data.items.length > 0;
    const resolvedType = data.type || (hasItems ? "combo" : "simples");

    const { data: packaging, error } = await supabase
      .from("packagings")
      .insert({
        user_id: userId,
        store_id: activeStore?.id || null,
        name: data.name,
        type: resolvedType,
        category: data.category || null,
        description: data.description || null,
        cost_total: resolvedType === "simples" ? (data.cost_total || 0) : 0,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return null;
    }

    // Insert items
    if (hasItems && data.items!.length > 0) {
      const { error: itemsError } = await supabase
        .from("packaging_items")
        .insert(
          data.items!.map((item) => ({
            packaging_id: (packaging as any).id,
            ingredient_id: item.ingredient_id || null,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            subtotal: item.quantity * item.unit_cost,
          })) as any
        );

      if (itemsError) {
        toast({ title: "Erro", description: "Embalagem criada, mas itens falharam: " + itemsError.message, variant: "destructive" });
      }
    }

    toast({ title: "Sucesso", description: `Embalagem "${data.name}" criada!` });
    await fetchPackagings();
    return packaging;
  };

  const updatePackaging = async (
    id: string,
    data: {
      name?: string;
      category?: string;
      description?: string;
      cost_total?: number;
      is_active?: boolean;
      items?: { id?: string; ingredient_id?: string; item_name: string; quantity: number; unit_cost: number }[];
    }
  ) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category || null;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.cost_total !== undefined) updateData.cost_total = data.cost_total;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { error } = await supabase.from("packagings").update(updateData).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }

    // If items provided, replace all items
    if (data.items !== undefined) {
      await supabase.from("packaging_items").delete().eq("packaging_id", id);
      if (data.items.length > 0) {
        await supabase.from("packaging_items").insert(
          data.items.map((item) => ({
            packaging_id: id,
            ingredient_id: item.ingredient_id || null,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            subtotal: item.quantity * item.unit_cost,
          })) as any
        );
      }
    }

    toast({ title: "Sucesso", description: "Embalagem atualizada!" });
    await fetchPackagings();
    return true;
  };

  const deletePackaging = async (id: string) => {
    const { error } = await supabase.from("packagings").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Sucesso", description: "Embalagem excluída!" });
    await fetchPackagings();
    return true;
  };

  const duplicatePackaging = async (packaging: Packaging) => {
    const items = packaging.packaging_items?.map((i) => ({
      ingredient_id: i.ingredient_id || undefined,
      item_name: i.item_name,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
    }));

    return createPackaging({
      name: `${packaging.name} (cópia)`,
      type: packaging.type,
      category: packaging.category || undefined,
      description: packaging.description || undefined,
      cost_total: packaging.type === "simples" ? packaging.cost_total : undefined,
      items: items,
    });
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    return updatePackaging(id, { is_active: !currentActive });
  };

  const copyToStore = async (packaging: Packaging, targetStoreId: string) => {
    if (!userId) return false;

    // Check for name conflict
    const { data: existing } = await supabase
      .from("packagings")
      .select("id")
      .eq("user_id", userId)
      .eq("store_id", targetStoreId)
      .eq("name", packaging.name)
      .maybeSingle();

    if (existing) {
      toast({
        title: "Conflito de nome",
        description: `Já existe uma embalagem "${packaging.name}" na loja de destino.`,
        variant: "destructive",
      });
      return false;
    }

    const { data: newPkg, error } = await supabase
      .from("packagings")
      .insert({
        user_id: userId,
        store_id: targetStoreId,
        name: packaging.name,
        type: packaging.type,
        category: packaging.category,
        description: packaging.description,
        cost_total: packaging.cost_total,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }

    if (packaging.type === "combo" && packaging.packaging_items?.length) {
      await supabase.from("packaging_items").insert(
        packaging.packaging_items.map((item) => ({
          packaging_id: (newPkg as any).id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          subtotal: item.subtotal,
        })) as any
      );
    }

    toast({ title: "Sucesso", description: `Embalagem copiada para outra loja!` });
    return true;
  };

  return {
    packagings,
    loading,
    userId,
    fetchPackagings,
    createPackaging,
    updatePackaging,
    deletePackaging,
    duplicatePackaging,
    toggleActive,
    copyToStore,
    activePackagings: packagings.filter((p) => p.is_active),
  };
}

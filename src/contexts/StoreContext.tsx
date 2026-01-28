import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Store {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  business_type: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface StoreContextType {
  stores: Store[];
  activeStore: Store | null;
  isLoading: boolean;
  userPlan: string | null;
  canCreateStore: boolean;
  storeCount: number;
  maxStores: number;
  setActiveStore: (store: Store | null) => void;
  fetchStores: (userId: string) => Promise<void>;
  createStore: (name: string, logoUrl?: string, businessType?: string) => Promise<Store | null>;
  updateStore: (storeId: string, data: Partial<Pick<Store, "name" | "logo_url">>) => Promise<boolean>;
  deleteStore: (storeId: string) => Promise<boolean>;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const MAX_STORES_PRO = 3;
const ACTIVE_STORE_KEY = "precify_active_store_id";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStoreState] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const isPro = userPlan === "pro";
  const storeCount = stores.length;
  const canCreateStore = isPro && storeCount < MAX_STORES_PRO;

  const fetchStores = useCallback(async (uid: string) => {
    setIsLoading(true);
    
    // Fetch user plan
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_plan")
      .eq("user_id", uid)
      .maybeSingle();
    
    setUserPlan(profileData?.user_plan || "free");
    setUserId(uid);

    // Fetch stores - cast to any to handle type generation delay
    const { data: storesData, error } = await (supabase
      .from("stores" as any)
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: true }) as any);

    if (error) {
      console.error("Error fetching stores:", error);
      setIsLoading(false);
      return;
    }

    const fetchedStores = (storesData || []) as Store[];
    setStores(fetchedStores);

    // Restore active store from localStorage or set default
    const savedStoreId = localStorage.getItem(ACTIVE_STORE_KEY);
    let storeToActivate: Store | null = null;

    if (savedStoreId) {
      storeToActivate = fetchedStores.find((s) => s.id === savedStoreId) || null;
    }

    // If no saved store or saved store not found, try default
    if (!storeToActivate && fetchedStores.length > 0) {
      storeToActivate = fetchedStores.find((s) => s.is_default) || fetchedStores[0];
    }

    setActiveStoreState(storeToActivate);
    setIsLoading(false);
  }, []);

  const refreshStores = useCallback(async () => {
    if (userId) {
      await fetchStores(userId);
    }
  }, [userId, fetchStores]);

  const setActiveStore = useCallback((store: Store | null) => {
    setActiveStoreState(store);
    if (store) {
      localStorage.setItem(ACTIVE_STORE_KEY, store.id);
    } else {
      localStorage.removeItem(ACTIVE_STORE_KEY);
    }
  }, []);

  const createStore = useCallback(async (name: string, logoUrl?: string, businessType?: string): Promise<Store | null> => {
    if (!userId) return null;
    
    if (!isPro) {
      toast({
        title: "Plano Pro necessário",
        description: "Múltiplas lojas estão disponíveis apenas no Plano Pro.",
        variant: "destructive",
      });
      return null;
    }

    if (storeCount >= MAX_STORES_PRO) {
      toast({
        title: "Limite atingido",
        description: `Você já possui o máximo de ${MAX_STORES_PRO} lojas permitidas no Plano Pro.`,
        variant: "destructive",
      });
      return null;
    }

    const isFirstStore = stores.length === 0;

    const { data, error } = await (supabase
      .from("stores" as any)
      .insert({
        user_id: userId,
        name,
        logo_url: logoUrl || null,
        business_type: businessType || null,
        is_default: isFirstStore,
      })
      .select()
      .single() as any);

    if (error) {
      console.error("Error creating store:", error);
      toast({
        title: "Erro ao criar loja",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    const newStore = data as Store;
    setStores((prev) => [...prev, newStore]);
    
    if (isFirstStore || !activeStore) {
      setActiveStore(newStore);
    }

    toast({
      title: "Loja criada!",
      description: `"${name}" foi criada com sucesso.`,
    });

    return newStore;
  }, [userId, isPro, storeCount, stores.length, activeStore, setActiveStore, toast]);

  const updateStore = useCallback(async (storeId: string, data: Partial<Pick<Store, "name" | "logo_url">>): Promise<boolean> => {
    const { error } = await (supabase
      .from("stores" as any)
      .update(data)
      .eq("id", storeId) as any);

    if (error) {
      console.error("Error updating store:", error);
      toast({
        title: "Erro ao atualizar loja",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, ...data } : s))
    );

    if (activeStore?.id === storeId) {
      setActiveStoreState((prev) => (prev ? { ...prev, ...data } : prev));
    }

    toast({
      title: "Loja atualizada!",
      description: "As alterações foram salvas.",
    });

    return true;
  }, [activeStore, toast]);

  const deleteStore = useCallback(async (storeId: string): Promise<boolean> => {
    if (stores.length <= 1) {
      toast({
        title: "Não é possível excluir",
        description: "Você precisa ter pelo menos uma loja ativa.",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await (supabase
      .from("stores" as any)
      .delete()
      .eq("id", storeId) as any);

    if (error) {
      console.error("Error deleting store:", error);
      toast({
        title: "Erro ao excluir loja",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    const remainingStores = stores.filter((s) => s.id !== storeId);
    setStores(remainingStores);

    // If deleted store was active, switch to another
    if (activeStore?.id === storeId) {
      const newActive = remainingStores.find((s) => s.is_default) || remainingStores[0];
      setActiveStore(newActive || null);
    }

    toast({
      title: "Loja excluída",
      description: "A loja e todos os seus dados foram removidos.",
    });

    return true;
  }, [stores, activeStore, setActiveStore, toast]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchStores(session.user.id);
        } else {
          setStores([]);
          setActiveStoreState(null);
          setUserPlan(null);
          setUserId(null);
          setIsLoading(false);
        }
      }
    );

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchStores(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchStores]);

  return (
    <StoreContext.Provider
      value={{
        stores,
        activeStore,
        isLoading,
        userPlan,
        canCreateStore,
        storeCount,
        maxStores: MAX_STORES_PRO,
        setActiveStore,
        fetchStores,
        createStore,
        updateStore,
        deleteStore,
        refreshStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}

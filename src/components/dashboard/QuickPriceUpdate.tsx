import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QuickPriceButton } from "./QuickPriceButton";
import { QuickPriceModal } from "./QuickPriceModal";

const STATS_KEY = "precify_price_update_stats";

interface UpdateStats {
  totalUpdates: number;
  totalRecipesRecalculated: number;
}

function loadStats(): UpdateStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { totalUpdates: 0, totalRecipesRecalculated: 0 };
}

function saveStats(stats: UpdateStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

interface QuickPriceUpdateProps {
  userId: string;
  storeId: string | null;
  onPriceUpdated?: () => void;
}

export function QuickPriceUpdate({ userId, storeId, onPriceUpdated }: QuickPriceUpdateProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [ingredientsCount, setIngredientsCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [recipesAffectedCount, setRecipesAffectedCount] = useState(0);
  const [stats, setStats] = useState<UpdateStats>(loadStats);

  useEffect(() => {
    const fetchCount = async () => {
      let query = supabase
        .from("ingredients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (storeId) query = query.eq("store_id", storeId);
      const { count } = await query;
      setIngredientsCount(count || 0);
    };
    if (userId) fetchCount();
  }, [userId, storeId]);

  if (ingredientsCount === 0) return null;

  return (
    <>
      <QuickPriceButton
        ingredientsCount={ingredientsCount}
        updatedCount={updatedCount}
        recipesAffectedCount={recipesAffectedCount}
        totalUpdates={stats.totalUpdates}
        totalRecipesRecalculated={stats.totalRecipesRecalculated}
        onClick={() => setModalOpen(true)}
      />
      <QuickPriceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        userId={userId}
        storeId={storeId}
        onSave={(result) => {
          setUpdatedCount((c) => c + 1);
          setRecipesAffectedCount((c) => c + result.recipesCount);
          const newStats: UpdateStats = {
            totalUpdates: stats.totalUpdates + 1,
            totalRecipesRecalculated: stats.totalRecipesRecalculated + result.recipesCount,
          };
          setStats(newStats);
          saveStats(newStats);
          onPriceUpdated?.();
        }}
      />
    </>
  );
}

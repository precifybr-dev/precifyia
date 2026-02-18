import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, ChevronDown, Plus, Check, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/contexts/StoreContext";
import { CreateStoreModal } from "./CreateStoreModal";
import { cn } from "@/lib/utils";

export function StoreSwitcher() {
  const navigate = useNavigate();
  const {
    stores,
    activeStore,
    userPlan,
    canCreateStore,
    storeCount,
    maxStores,
    setActiveStore,
  } = useStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const isPro = userPlan === "pro";

  const handleStoreCreated = (storeId: string) => {
    // Navigate to the store onboarding page
    navigate(`/store-onboarding/${storeId}`);
  };

  const handleStoreSelect = async (store: typeof activeStore) => {
    if (!store) return;
    
    // Check if user can access this store (PRO downgrade protection)
    if (!isPro && stores.indexOf(store) > 0) {
      return; // Block access to non-first store for non-PRO users
    }
    
    await setActiveStore(store);
  };

  // If no stores exist (compatibility mode), don't render
  if (stores.length === 0 && !isPro) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-9 gap-2 px-3 border-border bg-card hover:bg-muted"
          >
            <Store className="h-4 w-4 text-primary" />
            <span className="max-w-[120px] truncate text-sm font-medium">
              {activeStore?.name || "Selecionar Loja"}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-[240px] bg-card border-border z-50">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Suas Lojas ({storeCount}/{maxStores})
          </DropdownMenuLabel>
          
          {stores.map((store, index) => {
            const isActive = activeStore?.id === store.id;
            const isBlocked = !isPro && index > 0;
            
            return (
              <DropdownMenuItem
                key={store.id}
                onClick={() => !isBlocked && handleStoreSelect(store)}
                className={cn(
                  "gap-2 cursor-pointer",
                  isActive && "bg-primary/10",
                  isBlocked && "opacity-50 cursor-not-allowed"
                )}
                disabled={isBlocked}
              >
                <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <Store className="h-3 w-3 text-primary" />
                </div>
                <span className="flex-1 truncate">{store.name}</span>
                {isActive && <Check className="h-4 w-4 text-primary" />}
                {isBlocked && <Lock className="h-3 w-3 text-muted-foreground" />}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          {/* Create new store button */}
          {isPro ? (
            <DropdownMenuItem
              onClick={() => canCreateStore && setIsCreateDialogOpen(true)}
              className={cn(
                "gap-2 cursor-pointer",
                !canCreateStore && "opacity-50 cursor-not-allowed"
              )}
              disabled={!canCreateStore}
            >
              <Plus className="h-4 w-4" />
              <span>Nova Loja</span>
              {!canCreateStore && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Limite atingido
                </span>
              )}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-primary"
              onClick={() => {
                // Could navigate to pricing page
              }}
            >
              <Crown className="h-4 w-4" />
              <span className="flex-1">Upgrade para Pro</span>
              <span className="text-xs text-muted-foreground">
                Multi-lojas
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Store Modal */}
      <CreateStoreModal
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onStoreCreated={handleStoreCreated}
      />
    </>
  );
}

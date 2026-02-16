import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileSpreadsheet, Package, Wine, Building2,
  LogOut, ChevronRight, Plus, Store, Crown, Sun, Moon,
  Sparkles, Headphones, HardDrive, Trash2, ChevronUp, GraduationCap, UtensilsCrossed, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";
import { Logo } from "@/components/ui/Logo";
import { CreateStoreModal } from "@/components/store/CreateStoreModal";

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  route: string;
};

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "dashboard", route: "/app" },
  { icon: Building2, label: "Área do Negócio", path: "business", route: "/app/business" },
  { icon: Package, label: "Insumos", path: "ingredients", route: "/app/ingredients" },
  { icon: Wine, label: "Bebidas", path: "beverages", route: "/app/beverages" },
  { icon: FileSpreadsheet, label: "Fichas Técnicas", path: "recipes", route: "/app/recipes" },
  { icon: Sparkles, label: "Combos (BETA)", path: "combos", route: "/app/combos" },
  { icon: UtensilsCrossed, label: "Meu Cardápio", path: "menu", route: "/app/menu" },
  { icon: BarChart3, label: "CMV Global", path: "cmv", route: "/app/cmv" },
  { icon: GraduationCap, label: "Universidade", path: "universidade", route: "/app/universidade" },
  { icon: Headphones, label: "Suporte", path: "support", route: "/app/support" },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  user: any;
  profile: any;
}

export function AppSidebar({ open, onClose, user, profile }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { activeStore, userPlan, canCreateStore, storeCount, maxStores } = useStore();
  const isPro = userPlan === "pro";
  const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  const currentPath = location.pathname;

  const getActiveNav = () => {
    if (currentPath === "/app" || currentPath === "/app/dashboard") return "dashboard";
    for (const item of navItems) {
      if (item.route !== "/app" && currentPath.startsWith(item.route)) return item.path;
    }
    return "";
  };

  const activeNav = getActiveNav();

  const handleNavClick = (item: NavItem) => {
    onClose();
    navigate(item.route);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logout realizado", description: "Até logo!" });
    navigate("/");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", newTheme);
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <button onClick={() => navigate("/app")} className="hover:opacity-80 transition-opacity">
              <Logo size="sm" showText />
            </button>
          </div>

          {/* Active Store Section */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {activeStore?.logo_url ? (
                  <img src={activeStore.logo_url} alt={activeStore.name} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">
                  {activeStore?.name || "Minha Loja"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {activeStore?.business_type
                    ? activeStore.business_type.charAt(0).toUpperCase() + activeStore.business_type.slice(1).replace(/_/g, " ")
                    : "Negócio"}
                </p>
              </div>
            </div>

            {isPro ? (
              <button
                onClick={() => setShowCreateStoreModal(true)}
                disabled={!canCreateStore}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  canCreateStore
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Nova Loja</span>
                {!canCreateStore && <span className="ml-auto text-xs">({storeCount}/{maxStores})</span>}
              </button>
            ) : (
              <button
                onClick={() => {
                  toast({
                    title: "Recurso exclusivo PRO",
                    description: "Múltiplas lojas estão disponíveis apenas no Plano Pro.",
                  });
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Loja</span>
                <Crown className="w-3.5 h-3.5 ml-auto text-warning" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeNav === item.path
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {activeNav !== item.path && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </button>
            ))}
          </nav>

          {/* Footer: Theme + User Menu */}
          <div className="p-4 border-t border-border space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </Button>

            <Separator />

            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors group">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-semibold text-primary text-sm">
                      {profile?.business_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold truncate text-foreground">
                      {profile?.business_name || user?.user_metadata?.full_name || "Usuário"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-56 p-2" sideOffset={8}>
                <div className="space-y-1">
                  <button
                    onClick={() => { onClose(); navigate("/app/recycle-bin"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                    <div className="text-left">
                      <span className="block font-medium">Lixeira</span>
                      <span className="block text-xs text-muted-foreground">Itens mantidos por 30 dias</span>
                    </div>
                  </button>
                  <button
                    onClick={() => { onClose(); navigate("/app/backup"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Backup dos meus dados</span>
                  </button>
                  <Separator className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Sair</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Create Store Modal */}
      <CreateStoreModal
        open={showCreateStoreModal}
        onOpenChange={setShowCreateStoreModal}
        onStoreCreated={(storeId) => {
          navigate(`/store-onboarding/${storeId}`);
        }}
      />
    </>
  );
}

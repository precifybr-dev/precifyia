import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRBAC } from "@/hooks/useRBAC";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Wallet,
  Headphones,
  BarChart3,
  History,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sun,
  Moon,
  BookOpen,
  Sparkles,
  Ticket,
  TrendingUp,
  GraduationCap,
  FileCode2,
  Server,
  Download,
  MousePointerClick,
  DollarSign,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

interface AdminLayoutProps {
  children: React.ReactNode;
  unreadAlerts?: number;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  section?: string;
  permission?: string;
  badge?: number;
  masterOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard, section: "overview" },
  { id: "users", label: "Usuários", icon: Users, section: "management", permission: "view_users" },
  { id: "collaborators", label: "Colaboradores", icon: UserCog, path: "/admin/collaborators", permission: "manage_collaborators" },
  { id: "financial", label: "Financeiro", icon: Wallet, section: "financial", permission: "view_financials" },
  { id: "support", label: "Suporte", icon: Headphones, section: "support", permission: "respond_support" },
  { id: "metrics", label: "Métricas", icon: BarChart3, section: "usage", permission: "view_metrics" },
  { id: "combos-ai", label: "Combos IA", icon: Sparkles, section: "combos", permission: "view_metrics" },
  { id: "affiliates", label: "Cupons & Afiliados", icon: Ticket, section: "affiliates", permission: "view_financials" },
  { id: "commissions", label: "Comissões", icon: Wallet, section: "commissions", permission: "view_financials", masterOnly: true },
  { id: "monetization", label: "Monetização", icon: TrendingUp, section: "monetization", permission: "view_financials", masterOnly: true },
  { id: "logs", label: "Logs", icon: History, section: "logs", permission: "view_logs" },
  { id: "university", label: "Universidade", icon: GraduationCap, section: "university", masterOnly: true },
  { id: "governance", label: "Governança", icon: FileCode2, section: "governance", masterOnly: true },
  { id: "cloud-costs", label: "Custos Cloud & IA", icon: Server, section: "cloud-costs", masterOnly: true },
  { id: "export", label: "Exportação de Dados", icon: Download, path: "/admin/export", masterOnly: true },
  { id: "system-book", label: "Livro do Sistema", icon: BookOpen, path: "/admin/system-book", masterOnly: true },
];

export function AdminLayout({ children, unreadAlerts = 0, activeSection, onSectionChange }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | undefined>();
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { hasPermission, isMaster, role } = useRBAC(userId);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    };
    getUser();

    // Check for dark mode preference
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const canAccessItem = (item: NavItem) => {
    if (item.masterOnly && !isMaster()) return false;
    if (!item.permission) return true;
    if (isMaster()) return true;
    return hasPermission(item.permission as any);
  };

  const isActive = (item: NavItem) => {
    if (item.path) {
      return location.pathname === item.path;
    }
    if (item.section && activeSection) {
      return item.section === activeSection;
    }
    return false;
  };

  const handleNavClick = (item: NavItem) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.section) {
      if (location.pathname !== "/admin") {
        navigate("/admin", { state: { section: item.section } });
      } else if (onSectionChange) {
        onSectionChange(item.section);
      }
    }
  };

  const getRoleLabel = () => {
    if (isMaster()) return "Master";
    switch (role) {
      case "suporte": return "Suporte";
      case "financeiro": return "Financeiro";
      case "analista": return "Analista";
      case "admin": return "Admin";
      default: return "Colaborador";
    }
  };

  const getRoleColor = () => {
    if (isMaster()) return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    switch (role) {
      case "suporte": return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "financeiro": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "analista": return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400";
      default: return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    }
  };

  return (
    <div className="min-h-screen flex bg-muted/30 dark:bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            "flex h-16 items-center border-b px-4",
            collapsed ? "justify-center" : "justify-between"
          )}>
            {!collapsed && (
              <div className="flex items-center gap-3">
                <Logo size="md" showText={false} />
                <div>
                  <span className="font-logo text-lg text-primary">PRECIFY</span>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Admin</p>
                </div>
              </div>
            )}
            {collapsed && <Logo size="sm" showText={false} />}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className={cn("h-8 w-8", collapsed && "absolute -right-3 top-6 rounded-full border bg-card shadow-sm")}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Role Badge */}
          {!collapsed && (
            <div className="px-4 py-3 border-b">
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                getRoleColor()
              )}>
                <Shield className="h-4 w-4" />
                <span>{getRoleLabel()}</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navItems.filter(canAccessItem).map((item) => {
                const Icon = item.icon;
                const active = isActive(item);

                const button = (
                  <Button
                    key={item.id}
                    variant={active ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-10",
                      collapsed && "justify-center px-2",
                      active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                    )}
                    onClick={() => handleNavClick(item)}
                  >
                    <Icon className={cn("h-5 w-5", active && "text-primary")} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.id === "support" && unreadAlerts > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                            {unreadAlerts}
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.id} delayDuration={0}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.label}
                        {item.id === "support" && unreadAlerts > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                            {unreadAlerts}
                          </Badge>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return button;
              })}
            </nav>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="border-t p-3 space-y-1">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn("w-full justify-start gap-3 h-10", collapsed && "justify-center px-2")}
                  onClick={toggleDarkMode}
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  {!collapsed && <span>{darkMode ? "Modo Claro" : "Modo Escuro"}</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  {darkMode ? "Modo Claro" : "Modo Escuro"}
                </TooltipContent>
              )}
            </Tooltip>

            <Separator className="my-2" />

            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-10 text-destructive hover:text-destructive hover:bg-destructive/10",
                    collapsed && "justify-center px-2"
                  )}
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                  {!collapsed && <span>Sair</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">Sair</TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300",
        collapsed ? "ml-16" : "ml-64"
      )}>
        {children}
      </main>
    </div>
  );
}

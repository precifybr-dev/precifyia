import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUniversityModules, useUniversityLessons, useUserProgress } from "@/hooks/useUniversity";
import type { UniversityModule, UniversityLesson } from "@/types/university";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  GraduationCap, BookOpen, Clock, Star, ArrowLeft, ArrowRight,
  CheckCircle2, ChevronRight, Award, Sparkles,
  LayoutDashboard, FileSpreadsheet, Package, Wine, Building2,
  LogOut, Menu, Store, Crown, Sun, Moon, Headphones,
  HardDrive, Trash2, ChevronUp, Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";
import { Logo } from "@/components/ui/Logo";
import { CreateStoreModal } from "@/components/store/CreateStoreModal";
import DOMPurify from "dompurify";

const LEVEL_LABELS = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };
const LEVEL_COLORS = { iniciante: "bg-emerald-500/10 text-emerald-600", intermediario: "bg-amber-500/10 text-amber-600", avancado: "bg-red-500/10 text-red-600" };


function isNewLesson(createdAt: string): boolean {
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
}

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
};

export default function University() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeStore, userPlan, canCreateStore, storeCount, maxStores } = useStore();
  const isPro = userPlan === "pro";

  // Auth & profile state
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  // University state
  const { modules, loading: modulesLoading } = useUniversityModules(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const { lessons, loading: lessonsLoading } = useUniversityLessons(selectedModuleId || undefined, false);
  const { progress, toggleComplete, markAccessed } = useUserProgress();

  const selectedModule = modules.find(m => m.id === selectedModuleId);
  const selectedLesson = lessons.find(l => l.id === selectedLessonId);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/login");
        return;
      }
      setUser(session.user);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setProfile(profileData);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          navigate("/login");
        }
      }
    );

    checkAuth();
    return () => subscription.unsubscribe();
  }, [navigate]);

  const getModuleLessonProgress = (moduleId: string, moduleLessons: UniversityLesson[]) => {
    if (moduleLessons.length === 0) return 0;
    const completed = moduleLessons.filter(l => progress.some(p => p.lesson_id === l.id && p.completed)).length;
    return Math.round((completed / moduleLessons.length) * 100);
  };

  const currentLessonIndex = lessons.findIndex(l => l.id === selectedLessonId);
  const nextLesson = currentLessonIndex >= 0 ? lessons[currentLessonIndex + 1] : null;
  const isCompleted = selectedLessonId ? progress.some(p => p.lesson_id === selectedLessonId && p.completed) : false;

  useEffect(() => {
    if (selectedLessonId) markAccessed(selectedLessonId);
  }, [selectedLessonId]);

  // Navigation
  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "dashboard" },
    { icon: Building2, label: "Área do Negócio", path: "business" },
    { icon: Package, label: "Insumos", path: "ingredients" },
    { icon: Wine, label: "Bebidas", path: "beverages" },
    { icon: FileSpreadsheet, label: "Fichas Técnicas", path: "recipes" },
    { icon: Sparkles, label: "Combos (BETA)", path: "combos" },
    { icon: GraduationCap, label: "Universidade", path: "universidade" },
    { icon: Headphones, label: "Suporte", path: "support" },
  ];

  const handleNavClick = (path: string) => {
    setSidebarOpen(false);
    const routes: Record<string, string> = {
      dashboard: "/app",
      business: "/app/business",
      ingredients: "/app/ingredients",
      beverages: "/app/beverages",
      recipes: "/app/recipes",
      combos: "/app/combos",
      backup: "/app/backup",
      support: "/app/support",
      universidade: "/app/universidade",
      "recycle-bin": "/app/recycle-bin",
    };
    if (routes[path]) navigate(routes[path]);
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

  // ─── Content renderers ───

  const renderLessonView = () => {
    if (!selectedLesson || !selectedModuleId) return null;
    const progressPercent = getModuleLessonProgress(selectedModuleId, lessons);

    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => setSelectedLessonId(null)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar às aulas
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <Badge className={LEVEL_COLORS[selectedLesson.level]}>{LEVEL_LABELS[selectedLesson.level]}</Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {selectedLesson.reading_time} min de leitura
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{selectedLesson.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{selectedModule?.title}</span>
            <span>•</span>
            <span>Aula {currentLessonIndex + 1} de {lessons.length}</span>
          </div>
          <Progress value={progressPercent} className="mt-4 h-2" />
        </div>

        <Card className="mb-8">
          <CardContent className="p-6 md:p-8 prose prose-sm max-w-none dark:prose-invert">
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedLesson.content) }} />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4">
          <Button
            variant={isCompleted ? "outline" : "default"}
            onClick={() => toggleComplete(selectedLesson.id)}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isCompleted ? "Concluída ✓" : "Marcar como Concluída"}
          </Button>
          {nextLesson && (
            <Button variant="outline" onClick={() => setSelectedLessonId(nextLesson.id)} className="gap-2">
              Próxima Aula <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderLessonsList = () => {
    if (!selectedModuleId || !selectedModule) return null;
    const progressPercent = getModuleLessonProgress(selectedModuleId, lessons);
    const allCompleted = progressPercent === 100 && lessons.length > 0;

    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedModuleId(null); setSelectedLessonId(null); }} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Todos os Módulos
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{selectedModule.title}</h1>
            {allCompleted && <Badge className="bg-success/10 text-success gap-1"><Award className="h-3 w-3" /> Módulo Concluído</Badge>}
          </div>
          <p className="text-muted-foreground">{selectedModule.description}</p>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-semibold">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>

        {lessonsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : lessons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Em breve</h3>
              <p className="text-muted-foreground">Novas aulas estão sendo preparadas para este módulo.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {lessons.map((lesson, idx) => {
              const done = progress.some(p => p.lesson_id === lesson.id && p.completed);
              return (
                <Card
                  key={lesson.id}
                  className={`hover:shadow-md transition-all cursor-pointer ${done ? "border-success/30" : ""}`}
                  onClick={() => setSelectedLessonId(lesson.id)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="font-semibold">{lesson.title}</h3>
                        {isNewLesson(lesson.created_at) && <Badge className="bg-primary/10 text-primary text-[10px]">Novo</Badge>}
                        {lesson.is_featured && <Badge className="bg-amber-500/10 text-amber-600 text-[10px]"><Star className="h-2.5 w-2.5 mr-0.5" /> Destaque</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{lesson.short_description}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.reading_time} min</span>
                        <Badge variant="outline" className="text-[10px]">{LEVEL_LABELS[lesson.level]}</Badge>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderModulesOverview = () => (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
          <GraduationCap className="h-5 w-5" />
          <span className="font-semibold">Universidade Precify</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Aprenda a lucrar mais com seu restaurante</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Conteúdos práticos e diretos para você dominar precificação, gestão financeira e crescimento.
        </p>
      </div>

      {modulesLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : modules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Em breve</h3>
            <p className="text-muted-foreground">Novos conteúdos estão sendo preparados para você.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {modules.map(mod => (
            <Card
              key={mod.id}
              className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
              onClick={() => setSelectedModuleId(mod.id)}
            >
              {mod.cover_image_url && (
                <div className="h-40 overflow-hidden">
                  <img src={mod.cover_image_url} alt={mod.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              )}
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{mod.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{mod.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary font-medium flex items-center gap-1">
                    Acessar <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Determine which content to render
  const renderContent = () => {
    if (selectedLesson && selectedModuleId) return renderLessonView();
    if (selectedModuleId && selectedModule) return renderLessonsList();
    return renderModulesOverview();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <button onClick={() => navigate("/")} className="hover:opacity-80 transition-opacity">
              <Logo size="sm" showText />
            </button>
          </div>

          {/* Active Store */}
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
                <p className="text-sm font-semibold truncate text-foreground">{activeStore?.name || "Minha Loja"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {activeStore?.business_type
                    ? activeStore.business_type.charAt(0).toUpperCase() + activeStore.business_type.slice(1).replace(/_/g, ' ')
                    : "Negócio"}
                </p>
              </div>
            </div>

            {isPro ? (
              <button
                onClick={() => setShowCreateStoreModal(true)}
                disabled={!canCreateStore}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  canCreateStore ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground cursor-not-allowed"
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
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.path === "universidade"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.path !== "universidade" && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </button>
            ))}
          </nav>

          {/* Footer */}
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
                    onClick={() => handleNavClick("recycle-bin")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                    <div className="text-left">
                      <span className="block font-medium">Lixeira</span>
                      <span className="block text-xs text-muted-foreground">Itens mantidos por 30 dias</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleNavClick("backup")}
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

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-foreground">Universidade</h1>
        </header>

        <div className="p-4 lg:p-8">
          {renderContent()}
        </div>
      </div>

      {/* Create Store Modal */}
      <CreateStoreModal open={showCreateStoreModal} onOpenChange={setShowCreateStoreModal} />
    </div>
  );
}

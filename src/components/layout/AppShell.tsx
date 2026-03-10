import { useState, useEffect, Suspense } from "react";
import { Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "./AppSidebar";
import { PageSkeleton } from "./PageSkeleton";
import { StoreSwitcher } from "@/components/store/StoreSwitcher";

export interface AppShellContext {
  user: any;
  profile: any;
  openSidebar: () => void;
}

export function useShell(): AppShellContext {
  return useOutletContext<AppShellContext>();
}

/** Reusable page header with hamburger + StoreSwitcher */
interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, headerActions }: PageHeaderProps) {
  const { openSidebar } = useShell();
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 hover:bg-muted rounded-lg flex-shrink-0"
          onClick={openSidebar}
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          {title && (
            <h1 className="font-display text-lg sm:text-xl font-bold text-foreground">{title}</h1>
          )}
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:block"><StoreSwitcher /></div>
          {headerActions}
        </div>
      </div>
    </header>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
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

      if (!profileData || profileData.onboarding_step !== "completed") {
        navigate("/onboarding");
        return;
      }

      setProfile(profileData);
      setIsReady(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          navigate("/login");
        }
      }
    );

    init();
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const ctx: AppShellContext = {
    user,
    profile,
    openSidebar: () => setSidebarOpen(true),
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        profile={profile}
      />
      <main className="flex-1 lg:ml-56">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet context={ctx} />
        </Suspense>
      </main>
    </div>
  );
}

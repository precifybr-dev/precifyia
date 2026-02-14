import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "./AppSidebar";
import { StoreSwitcher } from "@/components/store/StoreSwitcher";

interface AppLayoutProps {
  children: React.ReactNode;
  /** Page title shown in the mobile header */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Optional right-side header content (buttons, etc.) */
  headerActions?: React.ReactNode;
  /** If true, hides the default header (for pages that render their own) */
  hideHeader?: boolean;
}

export function AppLayout({ children, title, subtitle, headerActions, hideHeader }: AppLayoutProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

      if (!profileData || profileData.onboarding_step !== "completed") {
        navigate("/onboarding");
        return;
      }

      setProfile(profileData);
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        profile={profile}
      />

      <main className="flex-1 lg:ml-64">
        {!hideHeader && (
          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 hover:bg-muted rounded-lg flex-shrink-0"
                onClick={() => setSidebarOpen(true)}
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
        )}

        {children}
      </main>
    </div>
  );
}

export { type AppLayoutProps };

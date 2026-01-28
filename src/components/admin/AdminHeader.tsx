import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, Bell } from "lucide-react";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  unreadAlerts?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}

export function AdminHeader({
  title,
  subtitle,
  icon,
  unreadAlerts = 0,
  isLoading = false,
  onRefresh,
  actions,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {icon && <div className="text-primary">{icon}</div>}
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadAlerts > 0 && (
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="h-4 w-4" />
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs animate-pulse">
                {unreadAlerts}
              </Badge>
            </Button>
          )}

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          )}

          {actions}
        </div>
      </div>
    </header>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KPICard } from "@/components/admin/KPICard";
import { Sparkles, Bot, Target, Users, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ComboStats {
  totalCombos: number;
  combosThisMonth: number;
  usageThisMonth: number;
  byObjective: { name: string; value: number }[];
  byStatus: { status: string; count: number }[];
  topUsers: { user_id: string; email: string; plan: string; count: number; last_used: string }[];
  recentCombos: { id: string; name: string; objective: string; status: string; created_at: string; user_email: string }[];
}

const OBJECTIVE_LABELS: Record<string, string> = {
  ticket_medio: "Ticket médio",
  dias_fracos: "Dias fracos",
  percepcao_vantagem: "Percepção vantagem",
  girar_estoque: "Girar estoque",
  combo_familia: "Combo família",
  teste_rapido: "Teste rápido",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(262 83% 58%)",
  "hsl(199 89% 48%)",
];

export function CombosDashboard() {
  const [stats, setStats] = useState<ComboStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("admin-stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!error && data?.comboStats) {
        setStats(data.comboStats);
      }
    } catch (err) {
      console.error("Error fetching combo stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Dados de combos não disponíveis.
        </CardContent>
      </Card>
    );
  }

  const avgPerUser = stats.topUsers.length > 0
    ? (stats.usageThisMonth / stats.topUsers.length).toFixed(1)
    : "0";

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total de Combos"
          value={stats.totalCombos}
          subtitle="Desde o início"
          icon={<Sparkles className="h-5 w-5" />}
          variant="primary"
        />
        <KPICard
          title="Combos este Mês"
          value={stats.combosThisMonth}
          subtitle="Criados no mês atual"
          icon={<Bot className="h-5 w-5" />}
        />
        <KPICard
          title="Usos de IA (mês)"
          value={stats.usageThisMonth}
          subtitle="Gerações realizadas"
          icon={<TrendingUp className="h-5 w-5" />}
          variant="success"
        />
        <KPICard
          title="Média / Usuário"
          value={avgPerUser}
          subtitle="Gerações por usuário ativo"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Objective Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Distribuição por Objetivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byObjective.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem dados ainda</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.byObjective}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={70}
                        dataKey="value"
                        nameKey="name"
                      >
                        {stats.byObjective.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {stats.byObjective.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground">{OBJECTIVE_LABELS[item.name] || item.name}</span>
                      </div>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Uso por Usuário (mês)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[280px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-center">Gerações</TableHead>
                    <TableHead className="text-right">Último uso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Nenhum uso registrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.topUsers.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="text-sm truncate max-w-[180px]">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize text-xs">{u.plan}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{u.count}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(u.last_used), { addSuffix: true, locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent Combos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Combos Recentes
          </CardTitle>
          <CardDescription>Últimos combos gerados na plataforma</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentCombos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      Nenhum combo gerado ainda
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentCombos.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm">{c.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {OBJECTIVE_LABELS[c.objective] || c.objective}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === "published" ? "default" : "outline"} className="text-xs capitalize">
                          {c.status === "simulation" ? "Simulação" : c.status === "draft" ? "Rascunho" : "Publicado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                        {c.user_email}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {format(new Date(c.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useAffiliatesAdmin, CouponFormData } from "@/hooks/useAffiliatesAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { KPICard } from "@/components/admin/KPICard";
import {
  Ticket,
  Users,
  DollarSign,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  UserCheck,
  UserX,
  Percent,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  eligible: "Elegível",
  approved: "Aprovado",
  paid: "Pago",
  cancelled: "Cancelado",
  active: "Ativo",
  suspended: "Suspenso",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  eligible: "bg-blue-500/10 text-blue-600",
  approved: "bg-green-500/10 text-green-600",
  paid: "bg-emerald-500/10 text-emerald-600",
  cancelled: "bg-destructive/10 text-destructive",
  active: "bg-green-500/10 text-green-600",
  suspended: "bg-destructive/10 text-destructive",
};

function CreateCouponDialog({ affiliates, onSubmit }: { affiliates: any[]; onSubmit: (data: CouponFormData) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CouponFormData>({
    code: "",
    coupon_type: "interno",
    discount_type: "percentage",
    discount_value: 10,
    max_uses: null,
    expires_at: null,
    affiliate_id: null,
    notes: null,
  });

  const handleSubmit = () => {
    if (!form.code.trim()) return;
    onSubmit({ ...form, code: form.code.toUpperCase().trim() });
    setOpen(false);
    setForm({ code: "", coupon_type: "interno", discount_type: "percentage", discount_value: 10, max_uses: null, expires_at: null, affiliate_id: null, notes: null });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Novo Cupom
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Cupom</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Código</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="EX: PROMO10" className="uppercase" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.coupon_type} onValueChange={(v) => setForm({ ...form, coupon_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="influencer">Influencer</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Desconto (%)</Label>
              <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Máx. Usos</Label>
              <Input type="number" value={form.max_uses ?? ""} onChange={(e) => setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : null })} placeholder="Ilimitado" />
            </div>
            <div>
              <Label>Validade</Label>
              <Input type="date" value={form.expires_at ?? ""} onChange={(e) => setForm({ ...form, expires_at: e.target.value || null })} />
            </div>
          </div>
          {form.coupon_type === "influencer" && (
            <div>
              <Label>Afiliado</Label>
              <Select value={form.affiliate_id ?? ""} onValueChange={(v) => setForm({ ...form, affiliate_id: v || null })}>
                <SelectTrigger><SelectValue placeholder="Selecionar afiliado" /></SelectTrigger>
                <SelectContent>
                  {affiliates.filter((a: any) => a.status === "active").map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Observações</Label>
            <Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />
          </div>
          <Button onClick={handleSubmit} className="w-full">Criar Cupom</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AffiliatesDashboard() {
  const {
    coupons, affiliates, commissions, isLoading,
    createCoupon, toggleCoupon, updateAffiliateStatus, processCommissions,
    kpis, commissionsByStatus,
  } = useAffiliatesAdmin();

  const [commissionFilter, setCommissionFilter] = useState("all");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const filteredCommissions = commissionFilter === "all" ? commissions : commissions.filter((c: any) => c.status === commissionFilter);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="coupons" className="space-y-4">
        <TabsList>
          <TabsTrigger value="coupons" className="gap-2"><Ticket className="h-4 w-4" />Cupons</TabsTrigger>
          <TabsTrigger value="affiliates" className="gap-2"><Users className="h-4 w-4" />Afiliados</TabsTrigger>
          <TabsTrigger value="commissions" className="gap-2"><DollarSign className="h-4 w-4" />Comissões</TabsTrigger>
        </TabsList>

        {/* CUPONS */}
        <TabsContent value="coupons" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard title="Cupons Ativos" value={kpis.activeCoupons} icon={<Ticket className="h-5 w-5" />} variant="primary" />
            <KPICard title="Total de Usos" value={kpis.totalUses} icon={<CheckCircle2 className="h-5 w-5" />} />
            <KPICard title="Expirados" value={kpis.expiredCoupons} icon={<AlertTriangle className="h-5 w-5" />} variant="warning" />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Cupons</CardTitle>
                <CardDescription>{coupons.length} cupons cadastrados</CardDescription>
              </div>
              <CreateCouponDialog affiliates={affiliates} onSubmit={(data) => createCoupon.mutate(data)} />
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Desconto</TableHead>
                      <TableHead>Usos</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Afiliado</TableHead>
                      <TableHead className="text-right">Ativo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((coupon: any) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-semibold">{coupon.code}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">{coupon.coupon_type}</Badge>
                        </TableCell>
                        <TableCell>{coupon.discount_value}%</TableCell>
                        <TableCell>{coupon.current_uses}/{coupon.max_uses ?? "∞"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {coupon.expires_at ? format(new Date(coupon.expires_at), "dd/MM/yyyy") : "Sem limite"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {coupon.affiliates?.name || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={coupon.is_active}
                            onCheckedChange={(checked) => toggleCoupon.mutate({ id: coupon.id, is_active: checked })}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {coupons.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum cupom cadastrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AFILIADOS */}
        <TabsContent value="affiliates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard title="Afiliados Ativos" value={kpis.activeAffiliates} icon={<UserCheck className="h-5 w-5" />} variant="primary" />
            <KPICard title="Comissões Pendentes" value={formatCurrency(kpis.totalPending)} icon={<Clock className="h-5 w-5" />} variant="warning" />
            <KPICard title="Comissões Pagas" value={formatCurrency(kpis.totalPaid)} icon={<CreditCard className="h-5 w-5" />} variant="success" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Afiliados</CardTitle>
              <CardDescription>{affiliates.length} afiliados cadastrados</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Total Ganho</TableHead>
                      <TableHead>Pendente</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliates.map((aff: any) => (
                      <TableRow key={aff.id}>
                        <TableCell className="font-medium">{aff.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{aff.email}</TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_COLORS[aff.status] || ""} border-0`}>
                            {STATUS_LABELS[aff.status] || aff.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{(aff.commission_rate * 100).toFixed(0)}%</TableCell>
                        <TableCell>{formatCurrency(aff.total_earned)}</TableCell>
                        <TableCell>{formatCurrency(aff.total_pending)}</TableCell>
                        <TableCell>{formatCurrency(aff.total_paid)}</TableCell>
                        <TableCell className="text-right">
                          {aff.status === "pending" && (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => updateAffiliateStatus.mutate({ id: aff.id, status: "active" })}>
                              <UserCheck className="h-3 w-3" /> Aprovar
                            </Button>
                          )}
                          {aff.status === "active" && (
                            <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => updateAffiliateStatus.mutate({ id: aff.id, status: "suspended" })}>
                              <UserX className="h-3 w-3" /> Suspender
                            </Button>
                          )}
                          {aff.status === "suspended" && (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => updateAffiliateStatus.mutate({ id: aff.id, status: "active" })}>
                              <UserCheck className="h-3 w-3" /> Reativar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {affiliates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhum afiliado cadastrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMISSÕES */}
        <TabsContent value="commissions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard title="Pendente" value={formatCurrency(kpis.totalByStatus.pending)} icon={<Clock className="h-5 w-5" />} variant="warning" />
            <KPICard title="Elegível" value={formatCurrency(kpis.totalByStatus.eligible)} icon={<ArrowRight className="h-5 w-5" />} variant="primary" />
            <KPICard title="Aprovado" value={formatCurrency(kpis.totalByStatus.approved)} icon={<CheckCircle2 className="h-5 w-5" />} variant="success" />
            <KPICard title="Pago" value={formatCurrency(kpis.totalByStatus.paid)} icon={<CreditCard className="h-5 w-5" />} />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-base">Ledger de Comissões</CardTitle>
                <CardDescription>{commissions.length} registros</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={commissionFilter} onValueChange={setCommissionFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filtrar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="eligible">Elegível</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => processCommissions.mutate("advance-status")} disabled={processCommissions.isPending}>
                  <ArrowRight className="h-3 w-3" /> Avançar Pendentes
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => processCommissions.mutate("approve")} disabled={processCommissions.isPending}>
                  <CheckCircle2 className="h-3 w-3" /> Aprovar Elegíveis
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Afiliado</TableHead>
                      <TableHead>Mês/Ano</TableHead>
                      <TableHead>Recorrência</TableHead>
                      <TableHead>Taxa</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCommissions.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.affiliates?.name || "—"}</TableCell>
                        <TableCell>{c.period_month}/{c.period_year}</TableCell>
                        <TableCell>{c.recurring_month}/{c.max_recurring_months}</TableCell>
                        <TableCell>{(c.commission_rate * 100).toFixed(0)}%</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(c.commission_amount)}</TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_COLORS[c.status] || ""} border-0`}>
                            {STATUS_LABELS[c.status] || c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCommissions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma comissão encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

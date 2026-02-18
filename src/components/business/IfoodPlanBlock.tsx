import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Smartphone, Truck, Calculator, Percent, Info, ShoppingCart, Receipt, Gift, TrendingUp, HelpCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IfoodPlanBlockProps {
  userId: string;
  onRealPercentageChange?: (percentage: number | null) => void;
}

interface IfoodSettings {
  planType: string | null;
  baseRate: number | null;
  anticipationType: string; // "weekly" | "monthly"
  // Volume de Vendas
  monthlyOrders: number | null;
  averageTicket: number | null;
  // Cupons Detalhados
  offersCoupon: boolean;
  ordersWithCoupon: number | null;
  couponValue: number | null;
  couponType: string;
  couponAbsorber: string;
  // Taxa de Entrega
  hasDeliveryFee: boolean;
  deliveryFee: number | null;
  deliveryAbsorber: string;
  // Resultado
  realPercentage: number | null;
}

interface CalculatedMetrics {
  monthlyRevenue: number;
  couponMonthlyCost: number;
  couponImpactPercent: number;
  deliveryMonthlyCost: number;
  deliveryImpactPercent: number;
}

export default function IfoodPlanBlock({ userId, onRealPercentageChange }: IfoodPlanBlockProps) {
  const [settings, setSettings] = useState<IfoodSettings>({
    planType: null,
    baseRate: null,
    anticipationType: "weekly",
    monthlyOrders: null,
    averageTicket: null,
    offersCoupon: false,
    ordersWithCoupon: null,
    couponValue: null,
    couponType: "percent",
    couponAbsorber: "business",
    hasDeliveryFee: false,
    deliveryFee: null,
    deliveryAbsorber: "client",
    realPercentage: null,
  });
  const [metrics, setMetrics] = useState<CalculatedMetrics>({
    monthlyRevenue: 0,
    couponMonthlyCost: 0,
    couponImpactPercent: 0,
    deliveryMonthlyCost: 0,
    deliveryImpactPercent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("ifood_plan_type, ifood_base_rate, ifood_monthly_orders, ifood_average_ticket, ifood_offers_coupon, ifood_orders_with_coupon, ifood_coupon_value, ifood_coupon_type, ifood_coupon_absorber, ifood_has_delivery_fee, ifood_delivery_fee, ifood_delivery_absorber, ifood_real_percentage")
          .eq("user_id", userId)
          .single();

        if (error) throw error;

        if (data) {
          setSettings({
            planType: data.ifood_plan_type,
            baseRate: data.ifood_base_rate,
            anticipationType: (data as any).ifood_anticipation_type || "weekly",
            monthlyOrders: data.ifood_monthly_orders,
            averageTicket: data.ifood_average_ticket ? Number(data.ifood_average_ticket) : null,
            offersCoupon: data.ifood_offers_coupon || false,
            ordersWithCoupon: data.ifood_orders_with_coupon,
            couponValue: data.ifood_coupon_value ? Number(data.ifood_coupon_value) : null,
            couponType: data.ifood_coupon_type || "percent",
            couponAbsorber: data.ifood_coupon_absorber || "business",
            hasDeliveryFee: data.ifood_has_delivery_fee || false,
            deliveryFee: data.ifood_delivery_fee ? Number(data.ifood_delivery_fee) : null,
            deliveryAbsorber: data.ifood_delivery_absorber || "client",
            realPercentage: data.ifood_real_percentage ? Number(data.ifood_real_percentage) : null,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar configurações iFood:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchSettings();
    }
  }, [userId]);

  // Calculate real percentage and metrics whenever settings change
  useEffect(() => {
    if (!settings.planType || settings.baseRate === null) {
      setMetrics({
        monthlyRevenue: 0,
        couponMonthlyCost: 0,
        couponImpactPercent: 0,
        deliveryMonthlyCost: 0,
        deliveryImpactPercent: 0,
      });
      return;
    }

    // Calculate monthly revenue
    const monthlyRevenue = (settings.monthlyOrders || 0) * (settings.averageTicket || 0);

    // Start with REAL base rate (plan rate + iFood payment fee 3.2% + anticipation fee)
    const IFOOD_PAYMENT_FEE = 3.2;
    const anticipationFee = settings.anticipationType === "weekly" ? 1.99 : 0;
    let realPercentage = settings.baseRate + IFOOD_PAYMENT_FEE + anticipationFee;

    // Calculate coupon impact
    let couponMonthlyCost = 0;
    let couponImpactPercent = 0;

    if (settings.offersCoupon && settings.couponValue !== null && settings.couponValue > 0 && settings.couponAbsorber !== "ifood") {
      const ordersWithCoupon = settings.ordersWithCoupon || 0;
      const averageTicket = settings.averageTicket || 0;

      if (settings.couponType === "percent") {
        // Percentage coupon: value% of ticket per order with coupon
        couponMonthlyCost = ordersWithCoupon * averageTicket * (settings.couponValue / 100);
      } else {
        // Fixed coupon: fixed value per order with coupon
        couponMonthlyCost = ordersWithCoupon * settings.couponValue;
      }

      // Adjust for partial absorption
      if (settings.couponAbsorber === "partial") {
        couponMonthlyCost = couponMonthlyCost * 0.5;
      }

      // Calculate impact percentage
      if (monthlyRevenue > 0) {
        couponImpactPercent = (couponMonthlyCost / monthlyRevenue) * 100;
        realPercentage += couponImpactPercent;
      }
    }

    // Calculate delivery impact
    let deliveryMonthlyCost = 0;
    let deliveryImpactPercent = 0;

    if (settings.hasDeliveryFee && settings.deliveryAbsorber === "business" && settings.deliveryFee !== null && settings.deliveryFee > 0) {
      // Delivery fee absorbed by business
      deliveryMonthlyCost = (settings.monthlyOrders || 0) * settings.deliveryFee;

      // Calculate impact percentage
      if (monthlyRevenue > 0) {
        deliveryImpactPercent = (deliveryMonthlyCost / monthlyRevenue) * 100;
        realPercentage += deliveryImpactPercent;
      }
    }

    // Round to 2 decimal places and ensure non-negative
    realPercentage = Math.max(0, Math.round(realPercentage * 100) / 100);
    couponImpactPercent = Math.round(couponImpactPercent * 100) / 100;
    deliveryImpactPercent = Math.round(deliveryImpactPercent * 100) / 100;

    setMetrics({
      monthlyRevenue,
      couponMonthlyCost,
      couponImpactPercent,
      deliveryMonthlyCost,
      deliveryImpactPercent,
    });

    setSettings(prev => ({ ...prev, realPercentage }));
  }, [
    settings.planType,
    settings.baseRate,
    settings.anticipationType,
    settings.monthlyOrders,
    settings.averageTicket,
    settings.offersCoupon,
    settings.ordersWithCoupon,
    settings.couponValue,
    settings.couponType,
    settings.couponAbsorber,
    settings.hasDeliveryFee,
    settings.deliveryFee,
    settings.deliveryAbsorber,
  ]);

  // Auto-save settings whenever they change
  useEffect(() => {
    const saveSettings = async () => {
      if (isLoading || !userId) return;

      setIsSaving(true);
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            ifood_plan_type: settings.planType,
            ifood_base_rate: settings.baseRate,
            ifood_monthly_orders: settings.monthlyOrders,
            ifood_average_ticket: settings.averageTicket,
            ifood_offers_coupon: settings.offersCoupon,
            ifood_orders_with_coupon: settings.ordersWithCoupon,
            ifood_coupon_value: settings.couponValue,
            ifood_coupon_type: settings.couponType,
            ifood_coupon_absorber: settings.couponAbsorber,
            ifood_has_delivery_fee: settings.hasDeliveryFee,
            ifood_delivery_fee: settings.deliveryFee,
            ifood_delivery_absorber: settings.deliveryAbsorber,
            ifood_real_percentage: settings.realPercentage,
          })
          .eq("user_id", userId);

        if (error) throw error;

        // Notify parent component
        if (onRealPercentageChange) {
          onRealPercentageChange(settings.realPercentage);
        }
      } catch (error) {
        console.error("Erro ao salvar configurações iFood:", error);
        toast.error("Erro ao salvar configurações do iFood");
      } finally {
        setIsSaving(false);
      }
    };

    // Debounce save
    const timeoutId = setTimeout(saveSettings, 500);
    return () => clearTimeout(timeoutId);
  }, [settings, isLoading, userId, onRealPercentageChange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const [userEditedRate, setUserEditedRate] = useState(false);

  const handlePlanTypeChange = (value: string) => {
    const autoRate = value === "own_delivery" ? 12 : value === "ifood_delivery" ? 23 : null;
    setSettings(prev => ({ ...prev, planType: value, baseRate: autoRate }));
    setUserEditedRate(false);
  };

  const handleAnticipationTypeChange = (value: string) => {
    setSettings(prev => ({ ...prev, anticipationType: value }));
  };

  const handleBaseRateChange = (value: string) => {
    const rate = value === "" ? null : parseFloat(value);
    setSettings(prev => ({ ...prev, baseRate: rate }));
    setUserEditedRate(true);
  };

  const handleMonthlyOrdersChange = (value: string) => {
    const orders = value === "" ? null : parseInt(value);
    setSettings(prev => ({ ...prev, monthlyOrders: orders }));
  };

  const handleAverageTicketChange = (value: string) => {
    const ticket = value === "" ? null : parseFloat(value);
    setSettings(prev => ({ ...prev, averageTicket: ticket }));
  };

  const handleCouponToggle = (checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      offersCoupon: checked,
      ordersWithCoupon: checked ? prev.ordersWithCoupon : null,
      couponValue: checked ? prev.couponValue : null,
    }));
  };

  const handleOrdersWithCouponChange = (value: string) => {
    const orders = value === "" ? null : parseInt(value);
    setSettings(prev => ({ ...prev, ordersWithCoupon: orders }));
  };

  const handleCouponValueChange = (value: string) => {
    const val = value === "" ? null : parseFloat(value);
    setSettings(prev => ({ ...prev, couponValue: val }));
  };

  const handleCouponTypeChange = (value: string) => {
    setSettings(prev => ({ ...prev, couponType: value }));
  };

  const handleCouponAbsorberChange = (value: string) => {
    setSettings(prev => ({ ...prev, couponAbsorber: value }));
  };

  const handleDeliveryFeeToggle = (checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      hasDeliveryFee: checked,
      deliveryFee: checked ? prev.deliveryFee : null,
    }));
  };

  const handleDeliveryFeeChange = (value: string) => {
    const val = value === "" ? null : parseFloat(value);
    setSettings(prev => ({ ...prev, deliveryFee: val }));
  };

  const handleDeliveryAbsorberChange = (value: string) => {
    setSettings(prev => ({ ...prev, deliveryAbsorber: value }));
  };

  if (isLoading) {
    return (
      <Card className="border-destructive/30 dark:border-destructive/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-destructive" />
            Plano iFood
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasVolumeData = settings.monthlyOrders !== null && settings.monthlyOrders > 0 && settings.averageTicket !== null && settings.averageTicket > 0;

  return (
    <Card className="border-destructive/30 dark:border-destructive/50 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-destructive" />
            Plano iFood
          </CardTitle>
          {isSaving && (
            <Badge variant="outline" className="text-xs">
              Salvando...
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tipo de Plano</Label>
          <RadioGroup
            value={settings.planType || ""}
            onValueChange={handlePlanTypeChange}
            className="grid grid-cols-2 gap-3"
          >
            <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${settings.planType === "own_delivery" ? "border-destructive bg-destructive/10" : "border-muted hover:border-destructive/50"}`}>
              <RadioGroupItem value="own_delivery" id="own_delivery" />
              <Label htmlFor="own_delivery" className="cursor-pointer flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Entrega Própria
              </Label>
            </div>
            <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${settings.planType === "ifood_delivery" ? "border-destructive bg-destructive/10" : "border-muted hover:border-destructive/50"}`}>
              <RadioGroupItem value="ifood_delivery" id="ifood_delivery" />
              <Label htmlFor="ifood_delivery" className="cursor-pointer flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Entrega iFood
              </Label>
            </div>
          </RadioGroup>
        </div>

        {settings.planType && (
          <>
            {/* Base Rate */}
            <div className="space-y-2">
              <Label htmlFor="base_rate" className="text-sm font-medium">
                Taxa Base do iFood (%)
              </Label>
              <div className="relative">
                <Input
                  id="base_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="Ex: 23.5"
                  value={settings.baseRate ?? ""}
                  onChange={(e) => handleBaseRateChange(e.target.value)}
                  className="pr-8"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Taxa de comissão base cobrada pelo iFood (ex: 12% Básico, 23% Entrega)
              </p>
              {/* Alert for unusual manual rate */}
              {userEditedRate && settings.baseRate !== null && settings.planType === "ifood_delivery" && settings.baseRate < 20 && (
                <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/30 rounded-lg mt-1">
                  <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-warning">
                    Atenção: esta taxa está diferente do padrão do iFood. Confirme se está correta.
                  </p>
                </div>
              )}
              {userEditedRate && settings.baseRate !== null && settings.planType === "own_delivery" && settings.baseRate < 8 && (
                <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/30 rounded-lg mt-1">
                  <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-warning">
                    Atenção: esta taxa está diferente do padrão do iFood. Confirme se está correta.
                  </p>
                </div>
              )}
            </div>

            {/* Taxa Real Explicada */}
            {settings.baseRate !== null && settings.baseRate > 0 && (
              <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold text-foreground">Composição Real das Taxas iFood</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-destructive/10">
                    <span className="text-muted-foreground">Taxa do Plano</span>
                    <span className="font-mono font-medium">{settings.baseRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-destructive/10">
                    <span className="text-muted-foreground">Taxa pagamento via iFood</span>
                    <span className="font-mono font-medium">3,2%</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-destructive/10">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Taxa de antecipação</span>
                      <RadioGroup
                        value={settings.anticipationType}
                        onValueChange={handleAnticipationTypeChange}
                        className="flex gap-3"
                      >
                        <div className={`flex items-center space-x-1.5 border rounded-md px-2 py-1 cursor-pointer text-xs ${settings.anticipationType === "weekly" ? "border-destructive bg-destructive/10" : "border-muted"}`}>
                          <RadioGroupItem value="weekly" id="anticipation_weekly" className="h-3 w-3" />
                          <Label htmlFor="anticipation_weekly" className="cursor-pointer text-xs">Semanal (1,99%)</Label>
                        </div>
                        <div className={`flex items-center space-x-1.5 border rounded-md px-2 py-1 cursor-pointer text-xs ${settings.anticipationType === "monthly" ? "border-success bg-success/10" : "border-muted"}`}>
                          <RadioGroupItem value="monthly" id="anticipation_monthly" className="h-3 w-3" />
                          <Label htmlFor="anticipation_monthly" className="cursor-pointer text-xs">Mensal (0%)</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <span className="font-mono font-medium">{settings.anticipationType === "weekly" ? "1,99%" : "0%"}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Taxa Base Real</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3.5 h-3.5 text-yellow-500/70 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[300px] text-xs">
                            <p className="font-semibold mb-1">Taxa Base Real do iFood</p>
                            <p>Esta é a taxa total real cobrada pelo iFood, considerando plano, forma de pagamento e antecipação (se houver).</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="font-mono font-bold text-destructive text-lg">
                      {(settings.baseRate + 3.2 + (settings.anticipationType === "weekly" ? 1.99 : 0)).toFixed(2)}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  <Info className="h-3 w-3 inline mr-1" />
                  Além da comissão do plano, o iFood cobra 3,2% sobre pagamentos online{settings.anticipationType === "weekly" ? " e 1,99% de antecipação semanal" : ". Antecipação mensal não possui taxa adicional"}.
                </p>
              </div>
            )}

            <Separator />

            {/* Volume de Vendas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-destructive" />
                <h4 className="font-semibold">Volume de Vendas iFood</h4>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border border-destructive/20">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Total de Pedidos Mensais</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ex: 500"
                    value={settings.monthlyOrders ?? ""}
                    onChange={(e) => handleMonthlyOrdersChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ticket Médio (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 45.00"
                    value={settings.averageTicket ?? ""}
                    onChange={(e) => handleAverageTicketChange(e.target.value)}
                  />
                </div>
              </div>

              {/* Calculated Monthly Revenue */}
              {hasVolumeData && (
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Faturamento Mensal iFood</span>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(metrics.monthlyRevenue)}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Política de Cupons */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-destructive" />
                <h4 className="font-semibold">Política de Cupons iFood</h4>
              </div>

              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-destructive/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="offers_coupon" className="text-sm font-medium">
                    O negócio utiliza cupons?
                  </Label>
                  <Switch
                    id="offers_coupon"
                    checked={settings.offersCoupon}
                    onCheckedChange={handleCouponToggle}
                  />
                </div>

                {settings.offersCoupon && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Total de Pedidos com Cupom (mensal)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Ex: 150"
                        value={settings.ordersWithCoupon ?? ""}
                        onChange={(e) => handleOrdersWithCouponChange(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Tipo de Cupom</Label>
                        <Select value={settings.couponType} onValueChange={handleCouponTypeChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Percentual (%)</SelectItem>
                            <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Valor Médio do Cupom {settings.couponType === "percent" ? "(%)" : "(R$)"}
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={settings.couponType === "percent" ? "Ex: 10" : "Ex: 5.00"}
                          value={settings.couponValue ?? ""}
                          onChange={(e) => handleCouponValueChange(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Quem absorve o cupom?</Label>
                      <RadioGroup
                        value={settings.couponAbsorber}
                        onValueChange={handleCouponAbsorberChange}
                        className="grid grid-cols-3 gap-2"
                      >
                        <div className={`flex items-center space-x-2 border rounded-md p-2 cursor-pointer text-sm ${settings.couponAbsorber === "business" ? "border-warning bg-warning/10" : "border-muted"}`}>
                          <RadioGroupItem value="business" id="coupon_business" />
                          <Label htmlFor="coupon_business" className="cursor-pointer text-sm">Negócio</Label>
                        </div>
                        <div className={`flex items-center space-x-2 border rounded-md p-2 cursor-pointer text-sm ${settings.couponAbsorber === "partial" ? "border-warning bg-warning/10" : "border-muted"}`}>
                          <RadioGroupItem value="partial" id="coupon_partial" />
                          <Label htmlFor="coupon_partial" className="cursor-pointer text-sm">Parcial (50%)</Label>
                        </div>
                        <div className={`flex items-center space-x-2 border rounded-md p-2 cursor-pointer text-sm ${settings.couponAbsorber === "ifood" ? "border-success bg-success/10" : "border-muted"}`}>
                          <RadioGroupItem value="ifood" id="coupon_ifood" />
                          <Label htmlFor="coupon_ifood" className="cursor-pointer text-sm">iFood</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Coupon Impact */}
                    {hasVolumeData && settings.couponAbsorber !== "ifood" && metrics.couponMonthlyCost > 0 && (
                      <div className="p-3 bg-warning/10 rounded-lg border border-warning/30">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-foreground">Custo Mensal de Cupons</span>
                          <span className="font-semibold text-foreground">{formatCurrency(metrics.couponMonthlyCost)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-foreground">% Impacto Cupom no Faturamento</span>
                          <Badge className="bg-warning text-warning-foreground">+{metrics.couponImpactPercent.toFixed(2)}%</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Taxa de Entrega */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-destructive" />
                <h4 className="font-semibold">Taxa de Entrega</h4>
              </div>

              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-destructive/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_delivery_fee" className="text-sm font-medium">
                    Existe taxa de entrega?
                  </Label>
                  <Switch
                    id="has_delivery_fee"
                    checked={settings.hasDeliveryFee}
                    onCheckedChange={handleDeliveryFeeToggle}
                  />
                </div>

                {settings.hasDeliveryFee && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Valor Médio da Taxa (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 8.00"
                        value={settings.deliveryFee ?? ""}
                        onChange={(e) => handleDeliveryFeeChange(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Quem absorve a taxa?</Label>
                      <RadioGroup
                        value={settings.deliveryAbsorber}
                        onValueChange={handleDeliveryAbsorberChange}
                        className="grid grid-cols-2 gap-2"
                      >
                        <div className={`flex items-center space-x-2 border rounded-md p-2 cursor-pointer text-sm ${settings.deliveryAbsorber === "client" ? "border-success bg-success/10" : "border-muted"}`}>
                          <RadioGroupItem value="client" id="delivery_client" />
                          <Label htmlFor="delivery_client" className="cursor-pointer text-sm">Cliente</Label>
                        </div>
                        <div className={`flex items-center space-x-2 border rounded-md p-2 cursor-pointer text-sm ${settings.deliveryAbsorber === "business" ? "border-warning bg-warning/10" : "border-muted"}`}>
                          <RadioGroupItem value="business" id="delivery_business" />
                          <Label htmlFor="delivery_business" className="cursor-pointer text-sm">Negócio</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Delivery Impact */}
                    {hasVolumeData && settings.deliveryAbsorber === "business" && metrics.deliveryMonthlyCost > 0 && (
                      <div className="p-3 bg-accent rounded-lg border border-accent-foreground/20">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-foreground">Custo Mensal de Entrega Absorvida</span>
                          <span className="font-semibold text-foreground">{formatCurrency(metrics.deliveryMonthlyCost)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-foreground">% Impacto Entrega no Faturamento</span>
                          <Badge className="bg-primary text-primary-foreground">+{metrics.deliveryImpactPercent.toFixed(2)}%</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Calculator Result */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-destructive" />
                <h4 className="font-semibold">Cálculo da Porcentagem Real</h4>
              </div>

              {/* Breakdown Table */}
              {settings.baseRate !== null && (
                <div className="border rounded-lg overflow-hidden bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-destructive/10">
                        <TableHead className="font-semibold text-foreground">Componente</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">Percentual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            Taxa Base Real
                            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                              plano + pgto + antecipação
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {(settings.baseRate + 3.2 + (settings.anticipationType === "weekly" ? 1.99 : 0)).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                      {settings.offersCoupon && settings.couponAbsorber !== "ifood" && metrics.couponImpactPercent > 0 && (
                        <TableRow>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              Impacto Cupons
                              <Badge variant="outline" className="text-xs bg-warning/20 text-warning-foreground border-warning/50">
                                calculado
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-warning">+{metrics.couponImpactPercent.toFixed(2)}%</TableCell>
                        </TableRow>
                      )}
                      {settings.hasDeliveryFee && settings.deliveryAbsorber === "business" && metrics.deliveryImpactPercent > 0 && (
                        <TableRow>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              Impacto Entrega Absorvida
                              <Badge variant="outline" className="text-xs bg-accent text-accent-foreground border-accent-foreground/30">
                                calculado
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-primary">+{metrics.deliveryImpactPercent.toFixed(2)}%</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Main Result */}
              <div className="p-4 bg-destructive text-destructive-foreground rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-sm font-medium opacity-90">Porcentagem Real iFood para Precificação</p>
                      <p className="text-xs opacity-75 mt-1">Valor usado automaticamente em todas as fichas técnicas</p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 opacity-75 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[300px] text-xs">
                          <p className="font-semibold mb-1">Taxa Base Real do iFood</p>
                          <p>Esta é a taxa total real cobrada pelo iFood, considerando plano, forma de pagamento e antecipação (se houver).</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold">
                      {settings.realPercentage !== null ? `${settings.realPercentage.toFixed(2)}%` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning: zero rate with active iFood */}
              {settings.realPercentage !== null && settings.realPercentage === 0 && settings.planType && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">
                    A taxa base real não pode ser zero com o iFood ativo. Verifique os valores informados.
                  </p>
                </div>
              )}

              {/* Warning if no volume data */}
              {settings.baseRate !== null && !hasVolumeData && (
                <div className="p-3 bg-warning/10 rounded-lg border border-warning/30 text-sm text-foreground">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-warning" />
                    <span className="font-medium">Preencha o volume de vendas</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Informe o total de pedidos e ticket médio para calcular o impacto real de cupons e entregas sobre o faturamento.
                  </p>
                </div>
              )}

              {/* Formula explanation */}
              <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded border border-destructive/10">
                <p className="font-medium mb-2 text-foreground">Fórmula de cálculo:</p>
                <p className="font-mono">% Real = Taxa Base Real (Plano + Pgto + Antecipação) + % Impacto Cupons + % Impacto Entrega</p>
                <p className="mt-2">
                  <strong>Taxa Base Real:</strong> Taxa do Plano + 3,2% (pagamento iFood) + {settings.anticipationType === "weekly" ? "1,99% (antecipação semanal)" : "0% (antecipação mensal)"}
                </p>
                <p>
                  <strong>Impacto Cupom:</strong> (Custo Total Cupons ÷ Faturamento iFood) × 100
                </p>
                <p>
                  <strong>Impacto Entrega:</strong> (Custo Total Entrega ÷ Faturamento iFood) × 100
                </p>
              </div>
            </div>
          </>
        )}

        {!settings.planType && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Selecione o tipo de plano para configurar a precificação iFood
          </p>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Smartphone, Truck, Calculator, Percent, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IfoodPlanBlockProps {
  userId: string;
  onRealPercentageChange?: (percentage: number | null) => void;
}

interface IfoodSettings {
  planType: string | null;
  baseRate: number | null;
  offersCoupon: boolean;
  couponValue: number | null;
  couponType: string;
  hasDeliveryFee: boolean;
  deliveryFee: number | null;
  deliveryAbsorber: string;
  realPercentage: number | null;
}

export default function IfoodPlanBlock({ userId, onRealPercentageChange }: IfoodPlanBlockProps) {
  const [settings, setSettings] = useState<IfoodSettings>({
    planType: null,
    baseRate: null,
    offersCoupon: false,
    couponValue: null,
    couponType: "percent",
    hasDeliveryFee: false,
    deliveryFee: null,
    deliveryAbsorber: "client",
    realPercentage: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("ifood_plan_type, ifood_base_rate, ifood_offers_coupon, ifood_coupon_value, ifood_coupon_type, ifood_has_delivery_fee, ifood_delivery_fee, ifood_delivery_absorber, ifood_real_percentage")
          .eq("user_id", userId)
          .single();

        if (error) throw error;

        if (data) {
          setSettings({
            planType: data.ifood_plan_type,
            baseRate: data.ifood_base_rate,
            offersCoupon: data.ifood_offers_coupon || false,
            couponValue: data.ifood_coupon_value,
            couponType: data.ifood_coupon_type || "percent",
            hasDeliveryFee: data.ifood_has_delivery_fee || false,
            deliveryFee: data.ifood_delivery_fee,
            deliveryAbsorber: data.ifood_delivery_absorber || "client",
            realPercentage: data.ifood_real_percentage,
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

  // Calculate real percentage whenever settings change
  useEffect(() => {
    if (!settings.planType || settings.baseRate === null) {
      return;
    }

    // Start with base rate
    let realPercentage = settings.baseRate;

    // Add coupon impact (if business offers coupon)
    if (settings.offersCoupon && settings.couponValue !== null && settings.couponValue > 0) {
      if (settings.couponType === "percent") {
        // Coupon percentage adds directly to the real percentage
        realPercentage += settings.couponValue;
      } else {
        // Fixed coupon - we'll estimate impact as percentage
        // This is approximate since it depends on average order value
        // For now, we'll add it as a fixed percentage estimate (e.g., 5% per R$10)
        realPercentage += (settings.couponValue / 100) * 5;
      }
    }

    // Add delivery fee impact (if business absorbs)
    if (settings.hasDeliveryFee && settings.deliveryAbsorber === "business" && settings.deliveryFee !== null && settings.deliveryFee > 0) {
      // Estimate delivery impact as percentage
      // This is approximate - typically R$8-10 represents ~8-10% on a R$100 order
      realPercentage += (settings.deliveryFee / 100) * 10;
    }

    // Round to 2 decimal places
    realPercentage = Math.round(realPercentage * 100) / 100;

    setSettings(prev => ({ ...prev, realPercentage }));
  }, [settings.planType, settings.baseRate, settings.offersCoupon, settings.couponValue, settings.couponType, settings.hasDeliveryFee, settings.deliveryFee, settings.deliveryAbsorber]);

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
            ifood_offers_coupon: settings.offersCoupon,
            ifood_coupon_value: settings.couponValue,
            ifood_coupon_type: settings.couponType,
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

  const handlePlanTypeChange = (value: string) => {
    setSettings(prev => ({ ...prev, planType: value }));
  };

  const handleBaseRateChange = (value: string) => {
    const rate = value === "" ? null : parseFloat(value);
    setSettings(prev => ({ ...prev, baseRate: rate }));
  };

  const handleCouponToggle = (checked: boolean) => {
    setSettings(prev => ({ 
      ...prev, 
      offersCoupon: checked,
      couponValue: checked ? prev.couponValue : null 
    }));
  };

  const handleCouponValueChange = (value: string) => {
    const val = value === "" ? null : parseFloat(value);
    setSettings(prev => ({ ...prev, couponValue: val }));
  };

  const handleCouponTypeChange = (value: string) => {
    setSettings(prev => ({ ...prev, couponType: value }));
  };

  const handleDeliveryFeeToggle = (checked: boolean) => {
    setSettings(prev => ({ 
      ...prev, 
      hasDeliveryFee: checked,
      deliveryFee: checked ? prev.deliveryFee : null 
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
      <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-red-600" />
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

  return (
    <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-red-600" />
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
            <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${settings.planType === "own_delivery" ? "border-red-500 bg-red-100" : "border-muted hover:border-red-300"}`}>
              <RadioGroupItem value="own_delivery" id="own_delivery" />
              <Label htmlFor="own_delivery" className="cursor-pointer flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Entrega Própria
              </Label>
            </div>
            <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${settings.planType === "ifood_delivery" ? "border-red-500 bg-red-100" : "border-muted hover:border-red-300"}`}>
              <RadioGroupItem value="ifood_delivery" id="ifood_delivery" />
              <Label htmlFor="ifood_delivery" className="cursor-pointer flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Entrega iFood
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Base Rate Input - Only show when plan is selected */}
        {settings.planType && (
          <>
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
                Informe a taxa de comissão base cobrada pelo iFood
              </p>
            </div>

            <Separator />

            {/* Real Percentage Calculator */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold">Calculadora de Porcentagem Real</h4>
              </div>

              {/* Coupon Section */}
              <div className="space-y-3 p-3 bg-white/50 rounded-lg border border-red-100">
                <div className="flex items-center justify-between">
                  <Label htmlFor="offers_coupon" className="text-sm font-medium">
                    O negócio oferece cupom?
                  </Label>
                  <Switch
                    id="offers_coupon"
                    checked={settings.offersCoupon}
                    onCheckedChange={handleCouponToggle}
                  />
                </div>

                {settings.offersCoupon && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Valor do Cupom</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 10"
                        value={settings.couponValue ?? ""}
                        onChange={(e) => handleCouponValueChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <Select value={settings.couponType} onValueChange={handleCouponTypeChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percentual (%)</SelectItem>
                          <SelectItem value="fixed">Fixo (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Fee Section */}
              <div className="space-y-3 p-3 bg-white/50 rounded-lg border border-red-100">
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
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Valor da Taxa (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 8.00"
                        value={settings.deliveryFee ?? ""}
                        onChange={(e) => handleDeliveryFeeChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Quem absorve a taxa?</Label>
                      <RadioGroup
                        value={settings.deliveryAbsorber}
                        onValueChange={handleDeliveryAbsorberChange}
                        className="grid grid-cols-2 gap-2"
                      >
                        <div className={`flex items-center space-x-2 border rounded-md p-2 cursor-pointer text-sm ${settings.deliveryAbsorber === "client" ? "border-green-500 bg-green-50" : "border-muted"}`}>
                          <RadioGroupItem value="client" id="client" />
                          <Label htmlFor="client" className="cursor-pointer text-sm">Cliente</Label>
                        </div>
                        <div className={`flex items-center space-x-2 border rounded-md p-2 cursor-pointer text-sm ${settings.deliveryAbsorber === "business" ? "border-orange-500 bg-orange-50" : "border-muted"}`}>
                          <RadioGroupItem value="business" id="business" />
                          <Label htmlFor="business" className="cursor-pointer text-sm">Negócio</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Result - Real Percentage */}
              <div className="p-4 bg-red-600 text-white rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">Porcentagem Real iFood para Precificação</p>
                    <p className="text-xs opacity-75 mt-1">Valor usado automaticamente nas fichas técnicas</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold">
                      {settings.realPercentage !== null ? `${settings.realPercentage.toFixed(2)}%` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              {settings.baseRate !== null && (
                <div className="text-xs text-muted-foreground space-y-1 p-2 bg-white/30 rounded">
                  <p><strong>Composição:</strong></p>
                  <p>• Taxa base iFood: {settings.baseRate}%</p>
                  {settings.offersCoupon && settings.couponValue !== null && settings.couponValue > 0 && (
                    <p>• Impacto cupom: +{settings.couponType === "percent" ? `${settings.couponValue}%` : `~${((settings.couponValue / 100) * 5).toFixed(2)}%`}</p>
                  )}
                  {settings.hasDeliveryFee && settings.deliveryAbsorber === "business" && settings.deliveryFee !== null && settings.deliveryFee > 0 && (
                    <p>• Impacto entrega absorvida: +{((settings.deliveryFee / 100) * 10).toFixed(2)}%</p>
                  )}
                </div>
              )}
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

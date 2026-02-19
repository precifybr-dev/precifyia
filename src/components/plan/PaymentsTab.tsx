import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Clock, User, Mail, Tag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function PaymentsTab() {
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [accountInfo, setAccountInfo] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    async function loadAccount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setAccountInfo({
        name: profile?.business_name || "Meu Negócio",
        email: user.email || "",
      });
    }
    loadAccount();
  }, []);

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-coupon", {
        body: { code: couponCode.trim().toUpperCase() },
      });
      if (error) throw error;
      if (data?.valid) {
        toast({
          title: "Cupom válido! 🎉",
          description: data.message || `Desconto de ${data.discount_value}% aplicado.`,
        });
      } else {
        toast({
          title: "Cupom inválido",
          description: data?.message || "Este cupom não é válido ou já expirou.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro ao validar",
        description: "Não foi possível validar o cupom. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const EmptyState = ({ icon: Icon, title, description }: { icon: typeof CreditCard; title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        <Tabs defaultValue="pending">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="history">Últimos pagamentos</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  icon={Clock}
                  title="Nenhum pagamento pendente"
                  description="Quando houver cobranças pendentes, elas aparecerão aqui. O meio de pagamento será integrado em breve."
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history">
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  icon={CreditCard}
                  title="Nenhum pagamento registrado"
                  description="O histórico de pagamentos estará disponível assim que o meio de pagamento for integrado."
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Coupon */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Inserir cupom de desconto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Digite o código do cupom"
                className="text-sm uppercase"
                onKeyDown={(e) => e.key === "Enter" && handleValidateCoupon()}
              />
              <Button
                onClick={handleValidateCoupon}
                disabled={!couponCode.trim() || validatingCoupon}
                size="sm"
                className="shrink-0"
              >
                {validatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Dados da conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Negócio</p>
                <p className="text-sm font-medium text-foreground">{accountInfo?.name || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="text-sm font-medium text-foreground truncate">{accountInfo?.email || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Meio de pagamento</span>
            </div>
            <Badge variant="secondary" className="text-xs">Em breve</Badge>
            <p className="text-xs text-muted-foreground mt-2">
              A integração com o meio de pagamento será disponibilizada em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

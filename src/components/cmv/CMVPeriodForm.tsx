import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, Info, Plus, Trash2 } from "lucide-react";
import { CMVPeriodo, CMVCategoria } from "@/hooks/useCMV";

interface CMVPeriodFormProps {
  periodoAtual: CMVPeriodo | null;
  categorias: CMVCategoria[];
  isSaving: boolean;
  categoriasDefault: string[];
  onSave: (dados: any) => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CMVPeriodForm({ periodoAtual, categorias, isSaving, categoriasDefault, onSave }: CMVPeriodFormProps) {
  const [modo, setModo] = useState<"simplificado" | "completo" | "avancado">(
    (periodoAtual?.modo as any) || "simplificado"
  );
  const [form, setForm] = useState({
    estoque_inicial: periodoAtual?.estoque_inicial?.toString() || "",
    compras: periodoAtual?.compras?.toString() || "",
    estoque_final: periodoAtual?.estoque_final?.toString() || "",
    ajustes: periodoAtual?.ajustes?.toString() || "",
    faturamento_liquido: periodoAtual?.faturamento_liquido?.toString() || "",
    meta_definida: periodoAtual?.meta_definida?.toString() || "",
  });

  const [catForm, setCatForm] = useState<
    { categoria: string; estoque_inicial: string; compras: string; estoque_final: string; ajustes: string }[]
  >([]);

  useEffect(() => {
    if (periodoAtual) {
      setModo((periodoAtual.modo as any) || "simplificado");
      setForm({
        estoque_inicial: periodoAtual.estoque_inicial?.toString() || "",
        compras: periodoAtual.compras?.toString() || "",
        estoque_final: periodoAtual.estoque_final?.toString() || "",
        ajustes: periodoAtual.ajustes?.toString() || "",
        faturamento_liquido: periodoAtual.faturamento_liquido?.toString() || "",
        meta_definida: periodoAtual.meta_definida?.toString() || "",
      });
    }
  }, [periodoAtual]);

  useEffect(() => {
    if (modo === "avancado") {
      if (categorias.length > 0) {
        setCatForm(
          categorias.map((c) => ({
            categoria: c.categoria,
            estoque_inicial: c.estoque_inicial?.toString() || "0",
            compras: c.compras?.toString() || "0",
            estoque_final: c.estoque_final?.toString() || "0",
            ajustes: c.ajustes?.toString() || "0",
          }))
        );
      } else {
        setCatForm(
          categoriasDefault.map((cat) => ({
            categoria: cat,
            estoque_inicial: "0",
            compras: "0",
            estoque_final: "0",
            ajustes: "0",
          }))
        );
      }
    }
  }, [modo, categorias, categoriasDefault]);

  const p = (v: string) => parseFloat(v) || 0;

  const cmvPreview = modo === "simplificado"
    ? p(form.compras)
    : p(form.estoque_inicial) + p(form.compras) - p(form.estoque_final) - p(form.ajustes);

  const cmvPercentPreview = p(form.faturamento_liquido)
    ? (cmvPreview / p(form.faturamento_liquido)) * 100
    : 0;

  const handleSubmit = () => {
    onSave({
      modo,
      estoque_inicial: p(form.estoque_inicial),
      compras: p(form.compras),
      estoque_final: p(form.estoque_final),
      ajustes: p(form.ajustes),
      faturamento_liquido: p(form.faturamento_liquido),
      meta_definida: form.meta_definida ? p(form.meta_definida) : null,
      categoriasData: modo === "avancado"
        ? catForm.map((c) => ({
            categoria: c.categoria,
            estoque_inicial: p(c.estoque_inicial),
            compras: p(c.compras),
            estoque_final: p(c.estoque_final),
            ajustes: p(c.ajustes),
          }))
        : undefined,
    });
  };

  const updateCat = (idx: number, field: string, value: string) => {
    setCatForm((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  return (
    <div className="space-y-6">
      {/* Modo selector */}
      <Tabs value={modo} onValueChange={(v) => setModo(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="simplificado">🔘 Simplificado</TabsTrigger>
          <TabsTrigger value="completo">📊 Completo</TabsTrigger>
          <TabsTrigger value="avancado">🔬 Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value="simplificado">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <CardTitle className="text-base">Modo Simplificado</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ideal para pequenos restaurantes que não fazem inventário formal. O cálculo é estimado.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Compras do Mês (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={form.compras}
                    onChange={(e) => setForm({ ...form, compras: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Faturamento Líquido (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={form.faturamento_liquido}
                    onChange={(e) => setForm({ ...form, faturamento_liquido: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Vendas - Taxas - Cupons - Cancelamentos</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-warning/5 border border-warning/20 text-xs text-foreground/80">
                ⚠️ Este é um cálculo estimado. Para maior precisão, utilize o modo completo.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completo">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Modo Completo</CardTitle>
              <p className="text-xs text-muted-foreground">CMV = Estoque Inicial + Compras – Estoque Final – Ajustes</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estoque Inicial (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={form.estoque_inicial}
                    onChange={(e) => setForm({ ...form, estoque_inicial: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compras Totais (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={form.compras}
                    onChange={(e) => setForm({ ...form, compras: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estoque Final (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={form.estoque_final}
                    onChange={(e) => setForm({ ...form, estoque_final: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ajustes (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={form.ajustes}
                    onChange={(e) => setForm({ ...form, ajustes: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Perdas, descarte, erro, inventário incorreto</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Faturamento Líquido (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={form.faturamento_liquido}
                    onChange={(e) => setForm({ ...form, faturamento_liquido: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Vendas brutas - Taxas iFood - Cupons - Cancelamentos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avancado">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Modo Avançado — por Categoria</CardTitle>
              <p className="text-xs text-muted-foreground">Divida seu inventário por categoria para análise detalhada</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Faturamento Líquido (R$) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.faturamento_liquido}
                  onChange={(e) => setForm({ ...form, faturamento_liquido: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                {catForm.map((cat, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{cat.categoria}</Badge>
                      {!categoriasDefault.includes(cat.categoria) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setCatForm((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Est. Inicial</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cat.estoque_inicial}
                          onChange={(e) => updateCat(idx, "estoque_inicial", e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Compras</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cat.compras}
                          onChange={(e) => updateCat(idx, "compras", e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Est. Final</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cat.estoque_final}
                          onChange={(e) => updateCat(idx, "estoque_final", e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Ajustes</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cat.ajustes}
                          onChange={(e) => updateCat(idx, "ajustes", e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCatForm((prev) => [
                    ...prev,
                    { categoria: `Categoria ${prev.length + 1}`, estoque_inicial: "0", compras: "0", estoque_final: "0", ajustes: "0" },
                  ])
                }
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar Categoria
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Meta */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <Label>Meta de CMV (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="Ex: 30"
              value={form.meta_definida}
              onChange={(e) => setForm({ ...form, meta_definida: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Defina sua meta ou deixe o sistema sugerir após 3 meses de dados</p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">CMV Estimado</p>
              <p className="text-xl font-bold">{formatCurrency(cmvPreview)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CMV %</p>
              <p className="text-xl font-bold">{cmvPercentPreview.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={handleSubmit} disabled={isSaving || !form.faturamento_liquido} className="w-full" size="lg">
        {isSaving ? (
          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        Salvar CMV do Período
      </Button>
    </div>
  );
}

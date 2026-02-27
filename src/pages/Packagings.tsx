import { useState, useEffect, useCallback } from "react";
import { Package, Plus, Pencil, Copy, Trash2, ToggleLeft, ToggleRight, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePackagings, type Packaging } from "@/hooks/usePackagings";
import { useStore } from "@/contexts/StoreContext";
import { Textarea } from "@/components/ui/textarea";
import { IngredientSelector, type IngredientData } from "@/components/recipes/IngredientSelector";
import { supabase } from "@/integrations/supabase/client";
import { ColorDot } from "@/components/ui/color-picker";

interface FormItem {
  ingredient_id?: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  code?: number;
  color?: string | null;
}

export default function Packagings() {
  const { packagings, loading, userId, createPackaging, updatePackaging, deletePackaging, duplicatePackaging, toggleActive, copyToStore } = usePackagings();
  const { stores, activeStore, userPlan } = useStore();
  const isPro = userPlan === "pro";
  const otherStores = stores.filter((s) => s.id !== activeStore?.id);

  const [ingredients, setIngredients] = useState<IngredientData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Packaging | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pkgToDelete, setPkgToDelete] = useState<Packaging | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [pkgToCopy, setPkgToCopy] = useState<Packaging | null>(null);
  const [targetStoreId, setTargetStoreId] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch ingredients for selector
  const fetchIngredients = useCallback(async () => {
    if (!userId) return;
    let query = supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", userId)
      .order("code", { ascending: true });

    if (activeStore?.id) {
      query = query.eq("store_id", activeStore.id);
    } else {
      query = query.is("store_id", null);
    }

    const { data } = await query;
    if (data) setIngredients(data as IngredientData[]);
  }, [userId, activeStore?.id]);

  useEffect(() => {
    if (userId) fetchIngredients();
  }, [userId, activeStore?.id, fetchIngredients]);

  const filtered = packagings.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formTotal = formItems.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);

  const resetForm = () => {
    setFormName("");
    setFormCategory("");
    setFormDescription("");
    setFormItems([]);
    setEditingPkg(null);
    setShowForm(false);
  };

  const openEdit = (pkg: Packaging) => {
    setEditingPkg(pkg);
    setFormName(pkg.name);
    setFormCategory(pkg.category || "");
    setFormDescription(pkg.description || "");
    setFormItems(
      pkg.packaging_items?.map((i) => {
        const ing = ingredients.find((ing) => ing.id === (i as any).ingredient_id);
        return {
          ingredient_id: (i as any).ingredient_id || undefined,
          item_name: i.item_name,
          unit: ing?.unit || "un",
          quantity: i.quantity,
          unit_cost: i.unit_cost,
          code: ing?.code,
          color: ing?.color,
        };
      }) || []
    );
    setShowForm(true);
  };

  const handleSelectIngredient = (ing: IngredientData) => {
    // Don't add duplicate
    if (formItems.some((i) => i.ingredient_id === ing.id)) return;
    const unitPrice = ing.unit_price ?? (ing.purchase_price / ing.purchase_quantity);
    setFormItems((prev) => [
      ...prev,
      {
        ingredient_id: ing.id,
        item_name: ing.name,
        unit: ing.unit,
        quantity: 1,
        unit_cost: unitPrice,
        code: ing.code,
        color: ing.color,
      },
    ]);
  };

  const removeItem = (idx: number) => setFormItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItemQuantity = (idx: number, qty: number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity: qty };
      return updated;
    });
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setIsSaving(true);

    const items = formItems.map((i) => ({
      ingredient_id: i.ingredient_id,
      item_name: i.item_name,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
    }));

    if (editingPkg) {
      await updatePackaging(editingPkg.id, {
        name: formName.trim(),
        category: formCategory,
        description: formDescription,
        items,
      });
    } else {
      await createPackaging({
        name: formName.trim(),
        category: formCategory || undefined,
        description: formDescription || undefined,
        items,
      });
    }

    setIsSaving(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (pkgToDelete) {
      await deletePackaging(pkgToDelete.id);
      setPkgToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleCopy = async () => {
    if (pkgToCopy && targetStoreId) {
      await copyToStore(pkgToCopy, targetStoreId);
      setPkgToCopy(null);
      setCopyDialogOpen(false);
      setTargetStoreId("");
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              Embalagens
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monte suas embalagens como fichas técnicas usando insumos cadastrados
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Embalagem
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Buscar embalagem..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Nenhuma embalagem cadastrada</p>
              <p className="text-sm mt-1">Crie sua primeira embalagem para vincular às fichas técnicas.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((pkg) => (
              <Card key={pkg.id} className={`transition-opacity ${!pkg.is_active ? "opacity-50" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{pkg.name}</h3>
                        {!pkg.is_active && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Inativa</Badge>
                        )}
                        {pkg.category && (
                          <Badge variant="outline" className="text-xs">{pkg.category}</Badge>
                        )}
                        {pkg.packaging_items && pkg.packaging_items.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {pkg.packaging_items.length} {pkg.packaging_items.length === 1 ? "insumo" : "insumos"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-lg font-bold text-primary mt-1">{formatCurrency(pkg.cost_total)}</p>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{pkg.description}</p>
                      )}
                      {pkg.packaging_items && pkg.packaging_items.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {pkg.packaging_items.map((i) => i.item_name).join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(pkg)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicatePackaging(pkg)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(pkg.id, pkg.is_active)}>
                        {pkg.is_active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
                      </Button>
                      {isPro && otherStores.length > 0 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => { setPkgToCopy(pkg); setTargetStoreId(""); setCopyDialogOpen(true); }}>
                          <StoreIcon className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { setPkgToDelete(pkg); setDeleteDialogOpen(true); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPkg ? "Editar Embalagem" : "Nova Embalagem"}</DialogTitle>
            <DialogDescription>
              {editingPkg ? "Atualize os dados da embalagem." : "Monte sua embalagem selecionando insumos cadastrados."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Marmita Completa G" />
            </div>

            <div>
              <Label>Categoria (opcional)</Label>
              <Input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="Ex: Descartáveis" />
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Observações..." rows={2} />
            </div>

            {/* Ingredient selector */}
            <div className="space-y-3">
              <Label>Insumos da Embalagem</Label>
              <IngredientSelector
                ingredients={ingredients}
                onSelect={handleSelectIngredient}
                placeholder="Buscar insumo por código ou nome..."
              />

              {formItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Insumo</TableHead>
                        <TableHead className="w-20 text-center">Qtd</TableHead>
                        <TableHead className="w-24 text-right">Custo</TableHead>
                        <TableHead className="w-24 text-right">Sub</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formItems.map((item, idx) => (
                        <TableRow key={item.ingredient_id || idx}>
                          <TableCell className="font-mono text-xs text-primary font-semibold">
                            <span className="flex items-center gap-1">
                              <ColorDot color={item.color} size="sm" />
                              {item.code || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(idx, parseFloat(e.target.value) || 1)}
                              className="h-8 text-center w-full"
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatCurrency(item.unit_cost)}/{item.unit}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">
                            {formatCurrency(item.quantity * item.unit_cost)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="px-4 py-3 bg-muted/50 text-right border-t">
                    <span className="text-sm text-muted-foreground">Total: </span>
                    <span className="text-base font-bold text-primary">{formatCurrency(formTotal)}</span>
                  </div>
                </div>
              )}

              {formItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Selecione insumos acima para montar a embalagem
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || isSaving}>
              {isSaving ? "Salvando..." : editingPkg ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir embalagem?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pkgToDelete?.name}" será excluída permanentemente. Produtos vinculados perderão esta embalagem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy to Store Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar para outra loja</DialogTitle>
            <DialogDescription>
              Selecione a loja de destino para copiar "{pkgToCopy?.name}".
            </DialogDescription>
          </DialogHeader>
          <Select value={targetStoreId} onValueChange={setTargetStoreId}>
            <SelectTrigger><SelectValue placeholder="Selecionar loja..." /></SelectTrigger>
            <SelectContent>
              {otherStores.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCopy} disabled={!targetStoreId}>Copiar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

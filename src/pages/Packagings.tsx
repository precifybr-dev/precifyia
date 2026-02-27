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

const units = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "L" },
  { value: "un", label: "un" },
];

interface FormRow {
  id: string;
  ingredientId: string | null;
  ingredientCode: number | null;
  name: string;
  quantity: string;
  unit: string;
  unitPrice: number;
  baseUnit: string;
  cost: number;
  color: string | null;
}

const createEmptyRow = (): FormRow => ({
  id: crypto.randomUUID(),
  ingredientId: null,
  ingredientCode: null,
  name: "",
  quantity: "",
  unit: "un",
  unitPrice: 0,
  baseUnit: "un",
  cost: 0,
  color: null,
});

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
  const [formRows, setFormRows] = useState<FormRow[]>([createEmptyRow()]);
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

  const formTotal = formRows.reduce((sum, r) => sum + r.cost, 0);

  const resetForm = () => {
    setFormName("");
    setFormCategory("");
    setFormDescription("");
    setFormRows([createEmptyRow()]);
    setEditingPkg(null);
    setShowForm(false);
  };

  const openEdit = (pkg: Packaging) => {
    setEditingPkg(pkg);
    setFormName(pkg.name);
    setFormCategory(pkg.category || "");
    setFormDescription(pkg.description || "");

    const rows: FormRow[] = pkg.packaging_items?.map((item) => {
      const ing = ingredients.find((i) => i.id === (item as any).ingredient_id);
      const unitPrice = item.unit_cost;
      const qty = item.quantity;
      return {
        id: crypto.randomUUID(),
        ingredientId: (item as any).ingredient_id || null,
        ingredientCode: ing?.code || null,
        name: item.item_name,
        quantity: qty.toString(),
        unit: ing?.unit || "un",
        unitPrice,
        baseUnit: ing?.unit || "un",
        cost: qty * unitPrice,
        color: ing?.color || null,
      };
    }) || [];

    setFormRows(rows.length > 0 ? rows : [createEmptyRow()]);
    setShowForm(true);
  };

  const handleSelectIngredient = (index: number, ing: IngredientData) => {
    const unitPrice = ing.unit_price ?? (ing.purchase_price / ing.purchase_quantity);
    setFormRows((prev) => {
      const updated = [...prev];
      const currentQty = parseFloat(updated[index].quantity) || 0;
      updated[index] = {
        ...updated[index],
        ingredientId: ing.id,
        ingredientCode: ing.code,
        name: ing.name,
        unit: ing.unit,
        unitPrice,
        baseUnit: ing.unit,
        cost: currentQty * unitPrice,
        color: ing.color,
      };
      return updated;
    });
  };

  const handleQuantityChange = (index: number, value: string) => {
    setFormRows((prev) => {
      const updated = [...prev];
      const qty = parseFloat(value) || 0;
      updated[index] = {
        ...updated[index],
        quantity: value,
        cost: qty * updated[index].unitPrice,
      };
      return updated;
    });
  };

  const handleUnitChange = (index: number, unit: string) => {
    setFormRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unit };
      return updated;
    });
  };

  const addRow = () => setFormRows((prev) => [...prev, createEmptyRow()]);

  const removeRow = (index: number) => {
    if (formRows.length <= 1) return;
    setFormRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setIsSaving(true);

    const validItems = formRows
      .filter((r) => r.ingredientId && parseFloat(r.quantity) > 0)
      .map((r) => ({
        ingredient_id: r.ingredientId!,
        item_name: r.name,
        quantity: parseFloat(r.quantity),
        unit_cost: r.unitPrice,
      }));

    if (editingPkg) {
      await updatePackaging(editingPkg.id, {
        name: formName.trim(),
        category: formCategory,
        description: formDescription,
        items: validItems,
      });
    } else {
      await createPackaging({
        name: formName.trim(),
        category: formCategory || undefined,
        description: formDescription || undefined,
        items: validItems,
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPkg ? "Editar Embalagem" : "Nova Embalagem"}</DialogTitle>
            <DialogDescription>
              {editingPkg ? "Atualize os dados da embalagem." : "Monte sua embalagem selecionando insumos cadastrados, igual a uma ficha técnica."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Marmita Completa G" />
              </div>
              <div>
                <Label>Categoria (opcional)</Label>
                <Input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="Ex: Descartáveis" />
              </div>
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Observações..." rows={2} />
            </div>

            {/* Spreadsheet-style table like Ficha Técnica */}
            <div className="space-y-2">
              <Label>Insumos da Embalagem</Label>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary dark:bg-primary hover:bg-primary dark:hover:bg-primary">
                        <TableHead className="text-primary-foreground font-semibold w-20">Código</TableHead>
                        <TableHead className="text-primary-foreground font-semibold min-w-[200px]">INSUMO</TableHead>
                        <TableHead className="text-primary-foreground font-semibold w-24 text-center">QTD</TableHead>
                        <TableHead className="text-primary-foreground font-semibold w-20 text-center">UND</TableHead>
                        <TableHead className="text-primary-foreground font-semibold w-28 text-right">CUSTO UN</TableHead>
                        <TableHead className="text-primary-foreground font-semibold w-24 text-right">CUSTO</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formRows.map((row, index) => (
                        <TableRow
                          key={row.id}
                          className={index % 2 === 0 ? "bg-card hover:bg-muted/50" : "bg-muted/30 hover:bg-muted/50"}
                        >
                          {/* Código com cor */}
                          <TableCell className="font-mono">
                            {row.ingredientCode ? (
                              <div className="flex items-center gap-1.5">
                                <ColorDot color={row.color} size="sm" />
                                <span className="font-semibold">{row.ingredientCode}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-muted" />
                                <span className="text-muted-foreground">—</span>
                              </div>
                            )}
                          </TableCell>

                          {/* Seletor de ingrediente */}
                          <TableCell className="p-1">
                            <IngredientSelector
                              ingredients={ingredients}
                              onSelect={(selected) => handleSelectIngredient(index, selected)}
                              selectedId={row.ingredientId || undefined}
                              placeholder="Buscar..."
                            />
                          </TableCell>

                          {/* Quantidade */}
                          <TableCell className="p-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0"
                              value={row.quantity}
                              onChange={(e) => handleQuantityChange(index, e.target.value)}
                              className="h-8 text-center font-mono text-sm"
                            />
                          </TableCell>

                          {/* Unidade */}
                          <TableCell className="p-1">
                            <Select
                              value={row.unit}
                              onValueChange={(value) => handleUnitChange(index, value)}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {units.map((u) => (
                                  <SelectItem key={u.value} value={u.value}>
                                    {u.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Custo Unitário */}
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">
                            {row.unitPrice > 0 ? `${formatCurrency(row.unitPrice)}/${row.baseUnit}` : "—"}
                          </TableCell>

                          {/* Custo Total */}
                          <TableCell className="text-right font-mono font-semibold text-sm">
                            <span className={row.cost > 0 ? "text-primary" : "text-muted-foreground"}>
                              {formatCurrency(row.cost)}
                            </span>
                          </TableCell>

                          {/* Botão de remover */}
                          <TableCell className="p-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeRow(index)}
                              disabled={formRows.length === 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Total row */}
                <div className="px-4 py-3 bg-muted/50 border-t flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Total da Embalagem</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(formTotal)}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-dashed w-full"
                onClick={addRow}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar insumo
              </Button>
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

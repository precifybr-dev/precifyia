import { useState } from "react";
import { Package, Plus, Pencil, Copy, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronRight, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePackagings, type Packaging } from "@/hooks/usePackagings";
import { useStore } from "@/contexts/StoreContext";
// Search is inline
import { Textarea } from "@/components/ui/textarea";

interface ComboItem {
  id?: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
}

export default function Packagings() {
  const { packagings, loading, createPackaging, updatePackaging, deletePackaging, duplicatePackaging, toggleActive, copyToStore } = usePackagings();
  const { stores, activeStore, userPlan } = useStore();
  const isPro = userPlan === "pro";
  const otherStores = stores.filter((s) => s.id !== activeStore?.id);

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
  const [formType, setFormType] = useState<"simples" | "combo">("simples");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCostTotal, setFormCostTotal] = useState("");
  const [formItems, setFormItems] = useState<ComboItem[]>([{ item_name: "", quantity: 1, unit_cost: 0 }]);
  const [isSaving, setIsSaving] = useState(false);

  const filtered = packagings.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const comboTotal = formItems.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);

  const resetForm = () => {
    setFormName("");
    setFormType("simples");
    setFormCategory("");
    setFormDescription("");
    setFormCostTotal("");
    setFormItems([{ item_name: "", quantity: 1, unit_cost: 0 }]);
    setEditingPkg(null);
    setShowForm(false);
  };

  const openEdit = (pkg: Packaging) => {
    setEditingPkg(pkg);
    setFormName(pkg.name);
    setFormType(pkg.type);
    setFormCategory(pkg.category || "");
    setFormDescription(pkg.description || "");
    setFormCostTotal(pkg.type === "simples" ? pkg.cost_total.toString() : "");
    setFormItems(
      pkg.type === "combo" && pkg.packaging_items?.length
        ? pkg.packaging_items.map((i) => ({ id: i.id, item_name: i.item_name, quantity: i.quantity, unit_cost: i.unit_cost }))
        : [{ item_name: "", quantity: 1, unit_cost: 0 }]
    );
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setIsSaving(true);

    if (editingPkg) {
      await updatePackaging(editingPkg.id, {
        name: formName.trim(),
        category: formCategory,
        description: formDescription,
        cost_total: formType === "simples" ? parseFloat(formCostTotal) || 0 : undefined,
        items: formType === "combo" ? formItems.filter((i) => i.item_name.trim()) : undefined,
      });
    } else {
      await createPackaging({
        name: formName.trim(),
        type: formType,
        category: formCategory || undefined,
        description: formDescription || undefined,
        cost_total: formType === "simples" ? parseFloat(formCostTotal) || 0 : undefined,
        items: formType === "combo" ? formItems.filter((i) => i.item_name.trim()) : undefined,
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

  const addItem = () => setFormItems((prev) => [...prev, { item_name: "", quantity: 1, unit_cost: 0 }]);
  const removeItem = (idx: number) => setFormItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof ComboItem, value: any) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
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
              Gerencie as embalagens dos seus produtos
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Embalagem
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Buscar embalagem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

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
                        <Badge variant={pkg.type === "combo" ? "default" : "secondary"} className="text-xs">
                          {pkg.type === "combo" ? "Combo" : "Simples"}
                        </Badge>
                        {!pkg.is_active && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Inativa</Badge>
                        )}
                        {pkg.category && (
                          <Badge variant="outline" className="text-xs">{pkg.category}</Badge>
                        )}
                      </div>
                      <p className="text-lg font-bold text-primary mt-1">{formatCurrency(pkg.cost_total)}</p>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{pkg.description}</p>
                      )}
                      {pkg.type === "combo" && pkg.packaging_items && pkg.packaging_items.length > 0 && (
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleActive(pkg.id, pkg.is_active)}
                      >
                        {pkg.is_active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
                      </Button>
                      {isPro && otherStores.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setPkgToCopy(pkg); setTargetStoreId(""); setCopyDialogOpen(true); }}
                        >
                          <StoreIcon className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { setPkgToDelete(pkg); setDeleteDialogOpen(true); }}
                      >
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
              {editingPkg ? "Atualize os dados da embalagem." : "Preencha os dados para criar uma embalagem."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Marmita PP" />
            </div>

            {!editingPkg && (
              <div>
                <Label>Tipo</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples">Simples (valor único)</SelectItem>
                    <SelectItem value="combo">Combo (múltiplos itens)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Categoria (opcional)</Label>
              <Input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="Ex: Descartáveis" />
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Observações..." rows={2} />
            </div>

            {formType === "simples" ? (
              <div>
                <Label>Custo Total (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formCostTotal}
                  onChange={(e) => setFormCostTotal(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Itens do Combo</Label>
                  <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                    <Plus className="w-3 h-3" /> Item
                  </Button>
                </div>
                {formItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      {idx === 0 && <Label className="text-xs">Nome</Label>}
                      <Input
                        value={item.item_name}
                        onChange={(e) => updateItem(idx, "item_name", e.target.value)}
                        placeholder="Item"
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Qtd</Label>}
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-3">
                      {idx === 0 && <Label className="text-xs">Custo (R$)</Label>}
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(idx, "unit_cost", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      {formItems.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="text-right text-sm font-semibold text-primary">
                  Total: {formatCurrency(comboTotal)}
                </div>
              </div>
            )}
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

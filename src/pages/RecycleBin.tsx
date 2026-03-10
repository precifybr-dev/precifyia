import { useState, useEffect } from "react";
import { Trash2, RotateCcw, Clock, Package, ChefHat, Wine, FileText, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useDataProtection, ProtectedTable } from "@/hooks/useDataProtection";
import { DestructiveActionDialog } from "@/components/security/DestructiveActionDialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/layout/AppShell";

interface DeletedRecord {
  id: string;
  original_table: string;
  original_id: string;
  data: Record<string, any>;
  deleted_at: string;
  expires_at: string;
  is_restored: boolean;
  store_id: string | null;
}

const TABLE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  ingredients: { label: "Insumos", icon: <Package className="w-4 h-4" /> },
  recipes: { label: "Fichas Técnicas", icon: <FileText className="w-4 h-4" /> },
  sub_recipes: { label: "Sub-receitas", icon: <ChefHat className="w-4 h-4" /> },
  beverages: { label: "Bebidas", icon: <Wine className="w-4 h-4" /> },
  fixed_costs: { label: "Custos Fixos", icon: <Package className="w-4 h-4" /> },
  variable_costs: { label: "Custos Variáveis", icon: <Package className="w-4 h-4" /> },
  fixed_expenses: { label: "Despesas Fixas", icon: <Package className="w-4 h-4" /> },
  variable_expenses: { label: "Despesas Variáveis", icon: <Package className="w-4 h-4" /> },
};

export default function RecycleBin() {
  const [deletedItems, setDeletedItems] = useState<DeletedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DeletedRecord | null>(null);
  const [dependencyInfo, setDependencyInfo] = useState<{ total: number; details: string[] } | null>(null);

  const { getDeletedItems, restore, permanentDelete, checkDependencies, isProcessing } = useDataProtection();

  const fetchItems = async () => {
    setIsLoading(true);
    const items = await getDeletedItems(
      selectedTab === "all" ? undefined : (selectedTab as ProtectedTable)
    );
    setDeletedItems(items);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [selectedTab]);

  const handleRestore = async (item: DeletedRecord) => {
    setRestoringId(item.id);
    const success = await restore({ deletedRecordId: item.id });
    if (success) {
      setDeletedItems((prev) => prev.filter((i) => i.id !== item.id));
    }
    setRestoringId(null);
  };

  const handlePermanentDelete = async () => {
    if (!selectedItem) return;
    const success = await permanentDelete(selectedItem.id);
    if (success) {
      setDeletedItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
    }
    setDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  const openDeleteDialog = async (item: DeletedRecord) => {
    setSelectedItem(item);
    setDependencyInfo(null);
    setDeleteDialogOpen(true);
    const deps = await checkDependencies(item.original_table, item.original_id);
    setDependencyInfo(deps);
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getItemName = (item: DeletedRecord): string => {
    const data = item.data;
    return data.name || data.title || `Item #${item.original_id.slice(0, 8)}`;
  };

  const groupedItems = deletedItems.reduce((acc, item) => {
    const table = item.original_table;
    if (!acc[table]) acc[table] = [];
    acc[table].push(item);
    return acc;
  }, {} as Record<string, DeletedRecord[]>);

  return (
    <>
      <PageHeader title="Lixeira" subtitle="Itens excluídos são mantidos por 30 dias" />
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="all" className="gap-2">
              Todos
              {deletedItems.length > 0 && (
                <Badge variant="secondary" className="ml-1">{deletedItems.length}</Badge>
              )}
            </TabsTrigger>
            {Object.entries(TABLE_LABELS).map(([key, { label, icon }]) => (
              <TabsTrigger key={key} value={key} className="gap-2">
                {icon}
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedTab}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : deletedItems.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Trash2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Lixeira vazia</p>
                  <p className="text-sm text-muted-foreground">Nenhum item foi excluído recentemente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {selectedTab === "all" ? (
                  Object.entries(groupedItems).map(([table, items]) => (
                    <Card key={table}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          {TABLE_LABELS[table]?.icon}
                          {TABLE_LABELS[table]?.label || table}
                          <Badge variant="outline">{items.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <RecycleBinItem key={item.id} item={item} onRestore={handleRestore} onDelete={openDeleteDialog} isRestoring={restoringId === item.id} getDaysRemaining={getDaysRemaining} getItemName={getItemName} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        {deletedItems.map((item) => (
                          <RecycleBinItem key={item.id} item={item} onRestore={handleRestore} onDelete={openDeleteDialog} isRestoring={restoringId === item.id} getDaysRemaining={getDaysRemaining} getItemName={getItemName} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DestructiveActionDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDependencyInfo(null); }}
          title="Excluir Permanentemente"
          itemName={selectedItem ? getItemName(selectedItem) : ""}
          warningMessage={
            dependencyInfo && dependencyInfo.total > 0
              ? `⚠️ Este item está vinculado a ${dependencyInfo.details.join(", ")}. Ao excluir permanentemente, esses vínculos serão perdidos e não poderão ser recuperados.`
              : "Este item será excluído permanentemente e não poderá ser recuperado."
          }
          confirmationWord="EXCLUIR"
          timerSeconds={5}
          onConfirm={handlePermanentDelete}
          isLoading={isProcessing}
          canRestore={false}
        />
      </div>
    </>
  );
}

interface RecycleBinItemProps {
  item: DeletedRecord;
  onRestore: (item: DeletedRecord) => void;
  onDelete: (item: DeletedRecord) => void;
  isRestoring: boolean;
  getDaysRemaining: (expiresAt: string) => number;
  getItemName: (item: DeletedRecord) => string;
}

function RecycleBinItem({ item, onRestore, onDelete, isRestoring, getDaysRemaining, getItemName }: RecycleBinItemProps) {
  const daysRemaining = getDaysRemaining(item.expires_at);
  const isExpiringSoon = daysRemaining <= 7;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{getItemName(item)}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span>Excluído {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true, locale: ptBR })}</span>
          <span className={`flex items-center gap-1 ${isExpiringSoon ? "text-amber-600" : ""}`}>
            <Clock className="w-3 h-3" />
            {daysRemaining} {daysRemaining === 1 ? "dia" : "dias"} restantes
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onRestore(item)} disabled={isRestoring} className="gap-1">
          {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          Restaurar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(item)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

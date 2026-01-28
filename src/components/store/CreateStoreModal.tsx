import { useState } from "react";
import { Store, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/contexts/StoreContext";

const BUSINESS_TYPES = [
  { value: "hamburgueria", label: "Hamburgueria" },
  { value: "pizzaria", label: "Pizzaria" },
  { value: "marmitaria", label: "Marmitaria" },
  { value: "confeitaria", label: "Confeitaria" },
  { value: "padaria", label: "Padaria" },
  { value: "restaurante", label: "Restaurante" },
  { value: "lanchonete", label: "Lanchonete" },
  { value: "food_truck", label: "Food Truck" },
  { value: "cafeteria", label: "Cafeteria" },
  { value: "sorveteria", label: "Sorveteria" },
  { value: "acaiteria", label: "Açaiteria" },
  { value: "doceria", label: "Doceria" },
  { value: "outro", label: "Outro" },
];

interface CreateStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoreCreated?: (storeId: string) => void;
}

export function CreateStoreModal({ open, onOpenChange, onStoreCreated }: CreateStoreModalProps) {
  const { createStore, storeCount, maxStores } = useStore();

  const [storeName, setStoreName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
  };

  const handleSubmit = async () => {
    if (!storeName.trim() || !businessType) return;

    setIsCreating(true);
    
    // For now, we pass businessType through the name since we need to update the createStore function
    // In a real scenario, we'd upload the logo to storage and get the URL
    const result = await createStore(storeName.trim(), logoPreview || undefined, businessType);
    
    setIsCreating(false);

    if (result) {
      // Reset form
      setStoreName("");
      setBusinessType("");
      setLogoPreview(null);
      onOpenChange(false);
      
      // Callback for navigation to onboarding
      if (onStoreCreated) {
        onStoreCreated(result.id);
      }
    }
  };

  const resetForm = () => {
    setStoreName("");
    setBusinessType("");
    setLogoPreview(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Store className="h-5 w-5 text-primary" />
            </div>
            Criar Nova Loja
          </DialogTitle>
          <DialogDescription>
            Configure os dados básicos da sua nova loja. Cada loja possui seus próprios 
            insumos, fichas técnicas e configurações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Logo Upload */}
          <div className="flex flex-col items-center gap-3">
            <Label className="text-sm text-muted-foreground">Logo (opcional)</Label>
            <div className="relative">
              {logoPreview ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-primary/20">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Adicionar</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Store Name */}
          <div className="space-y-2">
            <Label htmlFor="store-name">Nome da Loja *</Label>
            <Input
              id="store-name"
              placeholder="Ex: Hamburgueria do Centro"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Business Type */}
          <div className="space-y-2">
            <Label htmlFor="business-type">Tipo de Negócio *</Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger id="business-type" className="h-11">
                <SelectValue placeholder="Selecione o tipo do negócio" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {BUSINESS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p>
              ℹ️ Você está usando <strong>{storeCount}</strong> de <strong>{maxStores}</strong> lojas 
              disponíveis no Plano Pro.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!storeName.trim() || !businessType || isCreating}
          >
            {isCreating ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Criando...
              </>
            ) : (
              "Criar Loja"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

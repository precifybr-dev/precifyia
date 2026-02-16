import { useState, useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Store, ImageOff, LayoutList } from "lucide-react";
import type { FullMenuItem } from "@/hooks/useMenuMirror";

interface IfoodMenuViewProps {
  storeName: string;
  items: FullMenuItem[];
  isLoading: boolean;
}

function groupByCategory(items: FullMenuItem[]): Record<string, FullMenuItem[]> {
  const grouped: Record<string, FullMenuItem[]> = {};
  for (const item of items) {
    const cat = item.category || "Outros";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  return grouped;
}

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MenuItemCard({ item }: { item: FullMenuItem }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
        {item.image_url && !imgError ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-6 h-6 text-zinc-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
            {item.name}
          </h4>
          {item.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>
        <p className="text-sm font-bold text-[#EA1D2C] mt-1">
          {formatPrice(item.price)}
        </p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="w-20 h-20 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function IfoodMenuView({ storeName, items, isLoading }: IfoodMenuViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [separateByCategory, setSeparateByCategory] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const grouped = groupByCategory(items);
  const categories = Object.keys(grouped);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const scrollToCategory = (cat: string) => {
    setActiveCategory(cat);
    categoryRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) return <LoadingSkeleton />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Store className="w-12 h-12 text-zinc-400 mb-4" />
        <p className="text-zinc-500 text-sm">Nenhum item encontrado no cardápio.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Store Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="w-12 h-12 rounded-full bg-[#EA1D2C] flex items-center justify-center">
          <Store className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{storeName}</h2>
          <p className="text-xs text-zinc-500">{items.length} itens no cardápio</p>
        </div>
      </div>

      {/* Toggle + Category Bar */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <LayoutList className="w-4 h-4" />
          <span>Separar itens por categoria</span>
        </div>
        <Switch
          checked={separateByCategory}
          onCheckedChange={setSeparateByCategory}
        />
      </div>

      {/* Category Navigation Pills (only when toggle ON) */}
      {separateByCategory && categories.length > 1 && (
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => scrollToCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? "bg-[#EA1D2C] text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="p-4 space-y-6">
        {separateByCategory ? (
          // Grouped by category with headers
          categories.map((cat) => (
            <div
              key={cat}
              ref={(el) => { categoryRefs.current[cat] = el; }}
            >
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-[#EA1D2C] rounded-full" />
                {cat}
              </h3>
              <div className="space-y-2">
                {grouped[cat].map((item, idx) => (
                  <MenuItemCard key={`${cat}-${idx}`} item={item} />
                ))}
              </div>
            </div>
          ))
        ) : (
          // Flat list - all items in original order
          <div className="space-y-2">
            {items.map((item, idx) => (
              <MenuItemCard key={`flat-${idx}`} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

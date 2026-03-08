import { useState, useEffect, useMemo } from "react";
import {
  Search, BookOpen, Lightbulb, FileCode2, Tag, Filter,
  ChevronDown, ChevronUp, AlertTriangle, Info, Zap,
  Database, MessageSquare, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ArchitecturePrompt {
  id: string;
  name: string;
  description: string;
  category: string;
  criticality: string;
  status: string;
  prompt_text: string;
  related_tables: string[] | null;
  related_functions: string[] | null;
  related_files: string[] | null;
  related_edge_functions: string[] | null;
  impacts: string[] | null;
  dependencies: string[] | null;
  created_at: string;
}

interface DeliveryInsight {
  id: string;
  categoria: string;
  tipo_regra: string;
  descricao_regra: string;
  insight_text: string;
  impacto: string;
  tags: string[] | null;
  fonte: string | null;
  valor_min: number | null;
  valor_max: number | null;
}

type KnowledgeItem = {
  source: "architecture" | "delivery_insights";
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  criticality?: string;
  status?: string;
  fullData: ArchitecturePrompt | DeliveryInsight;
};

const SOURCE_CONFIG = {
  architecture: {
    label: "Livro do Sistema",
    icon: FileCode2,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
  delivery_insights: {
    label: "Insights de Delivery",
    icon: Lightbulb,
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/20",
  },
};

const CRITICALITY_COLORS: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  high: "bg-warning/10 text-warning border-warning/30",
  medium: "bg-primary/10 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

const IMPACT_COLORS: Record<string, string> = {
  alto: "bg-destructive/10 text-destructive border-destructive/30",
  medio: "bg-warning/10 text-warning border-warning/30",
  baixo: "bg-muted text-muted-foreground border-border",
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function KnowledgeBaseDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [architectureData, setArchitectureData] = useState<ArchitecturePrompt[]>([]);
  const [insightsData, setInsightsData] = useState<DeliveryInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<"all" | "architecture" | "delivery_insights">("all");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [archRes, insightsRes] = await Promise.all([
        supabase
          .from("architecture_prompts")
          .select("id, name, description, category, criticality, status, prompt_text, related_tables, related_functions, related_files, related_edge_functions, impacts, dependencies, created_at")
          .order("category", { ascending: true }),
        supabase
          .from("delivery_insights")
          .select("*")
          .order("categoria", { ascending: true }),
      ]);

      if (archRes.data) setArchitectureData(archRes.data);
      if (insightsRes.data) setInsightsData(insightsRes.data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Normalize all data into a unified format
  const allItems = useMemo<KnowledgeItem[]>(() => {
    const items: KnowledgeItem[] = [];

    architectureData.forEach((item) => {
      const tags: string[] = [];
      if (item.related_tables) tags.push(...item.related_tables.map((t) => `table:${t}`));
      if (item.related_functions) tags.push(...item.related_functions.map((f) => `fn:${f}`));
      if (item.related_edge_functions) tags.push(...item.related_edge_functions.map((e) => `edge:${e}`));
      if (item.related_files) tags.push(...item.related_files.map((f) => `file:${f}`));
      if (item.impacts) tags.push(...item.impacts);
      if (item.dependencies) tags.push(...item.dependencies);

      items.push({
        source: "architecture",
        id: item.id,
        title: item.name,
        description: item.description,
        category: item.category,
        tags,
        criticality: item.criticality,
        status: item.status,
        fullData: item,
      });
    });

    insightsData.forEach((item) => {
      items.push({
        source: "delivery_insights",
        id: item.id,
        title: item.descricao_regra,
        description: item.insight_text,
        category: item.categoria,
        tags: item.tags || [],
        criticality: item.impacto,
        fullData: item,
      });
    });

    return items;
  }, [architectureData, insightsData]);

  // Get all unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allItems
      .filter((i) => selectedSource === "all" || i.source === selectedSource)
      .forEach((i) => cats.add(i.category));
    return Array.from(cats).sort();
  }, [allItems, selectedSource]);

  // Filter items
  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);

    return allItems.filter((item) => {
      // Source filter
      if (selectedSource !== "all" && item.source !== selectedSource) return false;

      // Category filter
      if (selectedCategory && item.category !== selectedCategory) return false;

      // Text search
      if (normalizedQuery) {
        const searchableText = normalizeText(
          [item.title, item.description, item.category, ...item.tags].join(" ")
        );
        // Support multi-word search
        const words = normalizedQuery.split(/\s+/).filter(Boolean);
        return words.every((w) => searchableText.includes(w));
      }

      return true;
    });
  }, [allItems, searchQuery, selectedCategory, selectedSource]);

  // Stats
  const stats = useMemo(() => ({
    total: allItems.length,
    architecture: allItems.filter((i) => i.source === "architecture").length,
    insights: allItems.filter((i) => i.source === "delivery_insights").length,
    filtered: filteredItems.length,
  }), [allItems, filteredItems]);

  const renderExpandedContent = (item: KnowledgeItem) => {
    if (item.source === "architecture") {
      const data = item.fullData as ArchitecturePrompt;
      return (
        <div className="space-y-3 pt-3 border-t border-border">
          {data.prompt_text && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Prompt / Regra</p>
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-foreground whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-[300px] overflow-auto">
                {data.prompt_text}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {data.related_tables && data.related_tables.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tabelas</p>
                <div className="flex flex-wrap gap-1">
                  {data.related_tables.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px] font-mono">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
            {data.related_edge_functions && data.related_edge_functions.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Edge Functions</p>
                <div className="flex flex-wrap gap-1">
                  {data.related_edge_functions.map((e) => (
                    <Badge key={e} variant="outline" className="text-[10px] font-mono">{e}</Badge>
                  ))}
                </div>
              </div>
            )}
            {data.related_files && data.related_files.length > 0 && (
              <div className="col-span-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Arquivos</p>
                <div className="flex flex-wrap gap-1">
                  {data.related_files.map((f) => (
                    <Badge key={f} variant="outline" className="text-[10px] font-mono">{f}</Badge>
                  ))}
                </div>
              </div>
            )}
            {data.impacts && data.impacts.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Impactos</p>
                <div className="flex flex-wrap gap-1">
                  {data.impacts.map((i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{i}</Badge>
                  ))}
                </div>
              </div>
            )}
            {data.dependencies && data.dependencies.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Dependências</p>
                <div className="flex flex-wrap gap-1">
                  {data.dependencies.map((d) => (
                    <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (item.source === "delivery_insights") {
      const data = item.fullData as DeliveryInsight;
      return (
        <div className="space-y-3 pt-3 border-t border-border">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Insight Completo</p>
            <p className="text-sm text-foreground">{data.insight_text}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded-lg bg-muted/50 text-center">
              <p className="text-[10px] text-muted-foreground">Tipo Regra</p>
              <p className="text-xs font-medium text-foreground">{data.tipo_regra}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 text-center">
              <p className="text-[10px] text-muted-foreground">Impacto</p>
              <p className="text-xs font-medium text-foreground capitalize">{data.impacto}</p>
            </div>
            {data.valor_min !== null && (
              <div className="p-2 rounded-lg bg-muted/50 text-center">
                <p className="text-[10px] text-muted-foreground">Valor Mín</p>
                <p className="text-xs font-medium text-foreground">{data.valor_min}</p>
              </div>
            )}
            {data.valor_max !== null && (
              <div className="p-2 rounded-lg bg-muted/50 text-center">
                <p className="text-[10px] text-muted-foreground">Valor Máx</p>
                <p className="text-xs font-medium text-foreground">{data.valor_max}</p>
              </div>
            )}
          </div>
          {data.fonte && (
            <p className="text-[10px] text-muted-foreground">Fonte: {data.fonte}</p>
          )}
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
              ))}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Base de Conhecimento Interna
          </CardTitle>
          <CardDescription>
            Consulte regras de arquitetura, insights de delivery e documentação do sistema.
            Busca por palavras-chave sem uso de IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pergunte algo... ex: 'taxa ifood', 'RLS policy', 'margem CMV'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Source Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedSource === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectedSource("all"); setSelectedCategory(null); }}
              className="gap-1.5 text-xs"
            >
              <Database className="w-3.5 h-3.5" />
              Todas ({stats.total})
            </Button>
            <Button
              variant={selectedSource === "architecture" ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectedSource("architecture"); setSelectedCategory(null); }}
              className="gap-1.5 text-xs"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Livro do Sistema ({stats.architecture})
            </Button>
            <Button
              variant={selectedSource === "delivery_insights" ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectedSource("delivery_insights"); setSelectedCategory(null); }}
              className="gap-1.5 text-xs"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Insights Delivery ({stats.insights})
            </Button>
          </div>

          {/* Category Filters */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Filter className="w-3.5 h-3.5 text-muted-foreground mt-1" />
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer text-[10px] transition-colors",
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          )}

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filteredItems.length} resultado(s)
              {searchQuery && ` para "${searchQuery}"`}
              {selectedCategory && ` em "${selectedCategory}"`}
            </p>
            {(searchQuery || selectedCategory || selectedSource !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearchQuery(""); setSelectedCategory(null); setSelectedSource("all"); }}
                className="text-xs h-7"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-foreground mb-1">Nenhum resultado encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Tente buscar por outras palavras-chave ou remova os filtros aplicados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const config = SOURCE_CONFIG[item.source];
              const SourceIcon = config.icon;
              const isExpanded = expandedItem === item.id;

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "overflow-hidden transition-all cursor-pointer",
                    isExpanded && "ring-1 ring-primary/20"
                  )}
                >
                  <div
                    className="p-4 hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", config.bgColor)}>
                        <SourceIcon className={cn("w-4 h-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                          <Badge variant="outline" className="text-[9px]">{config.label}</Badge>
                          {item.criticality && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px]",
                                item.source === "architecture"
                                  ? CRITICALITY_COLORS[item.criticality] || ""
                                  : IMPACT_COLORS[item.criticality] || ""
                              )}
                            >
                              {item.criticality}
                            </Badge>
                          )}
                          {item.status && (
                            <Badge variant="outline" className="text-[9px]">{item.status}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="secondary" className="text-[9px]">
                            <Tag className="w-2.5 h-2.5 mr-1" />
                            {item.category}
                          </Badge>
                          {item.tags.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{item.tags.length} tag(s)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {isExpanded && renderExpandedContent(item)}
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

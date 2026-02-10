import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, HelpCircle, ExternalLink, Rocket, Calculator, Receipt, Store, TrendingUp, BarChart3, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHelpContent } from "@/hooks/useHelpContent";
import { HELP_CATEGORIES } from "@/lib/help-categories";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  primeiros_passos: <Rocket className="h-5 w-5" />,
  precificacao_cmv: <Calculator className="h-5 w-5" />,
  custos_despesas: <Receipt className="h-5 w-5" />,
  ifood_taxas: <Store className="h-5 w-5" />,
  lucro_margem: <TrendingUp className="h-5 w-5" />,
  relatorios: <BarChart3 className="h-5 w-5" />,
  conta_plano: <CreditCard className="h-5 w-5" />,
  problemas_comuns: <AlertCircle className="h-5 w-5" />,
};

export default function HelpCenter() {
  const navigate = useNavigate();
  const {
    items,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
  } = useHelpContent();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <HelpCircle className="h-6 w-6 text-primary" />
                Central de Ajuda
              </h1>
              <p className="text-sm text-muted-foreground">
                Encontre respostas rápidas sobre o sistema
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Busque por palavra-chave: lucro, CMV, iFood, margem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Categories sidebar */}
          <div className="lg:w-64 shrink-0">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Categorias</h3>
            <div className="flex flex-row lg:flex-col gap-2 flex-wrap">
              <Button
                variant={selectedCategory === null ? "default" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => setSelectedCategory(null)}
              >
                Todas ({categories.size > 0 ? Array.from(categories.values()).reduce((a, b) => a + b, 0) : 0})
              </Button>
              {HELP_CATEGORIES.map((cat) => {
                const count = categories.get(cat.id) || 0;
                if (count === 0 && !loading) return null;
                return (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "ghost"}
                    size="sm"
                    className="justify-start gap-2"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {CATEGORY_ICONS[cat.id]}
                    <span className="truncate">{cat.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando...
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Nenhum resultado encontrado para sua busca."
                    : "Nenhum artigo de ajuda disponível."}
                </p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-3">
                {items.map((item) => (
                  <AccordionItem
                    key={item.id}
                    value={item.id}
                    className="bg-card border border-border rounded-xl px-5 data-[state=open]:shadow-md transition-shadow"
                  >
                    <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-4 gap-3">
                      <div className="flex-1">
                        <span>{item.title}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-xs font-normal">
                            {HELP_CATEGORIES.find(c => c.id === item.category)?.label || item.category}
                          </Badge>
                          {item.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs font-normal">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                      {item.example && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                          <span className="font-medium text-foreground">Exemplo prático: </span>
                          <span className="text-muted-foreground">{item.example}</span>
                        </div>
                      )}
                      {item.link_to && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(item.link_to!)}
                          className="gap-1.5"
                        >
                          Ir para a tela
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

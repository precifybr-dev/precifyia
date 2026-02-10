import { useState } from "react";
import { useContextualHelp } from "@/hooks/useHelpContent";
import { HelpCircle, X, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

export function ContextualHelp() {
  const { items, loading, screenId } = useContextualHelp();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Don't render if no screen mapped or no items
  if (!screenId || items.length === 0) return null;

  return (
    <>
      {/* Floating button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg border-primary/30 bg-card hover:bg-primary/10"
        onClick={() => setOpen(!open)}
        aria-label="Ajuda contextual"
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5 text-primary" />}
      </Button>

      {/* Panel */}
      {open && (
        <Card className="fixed bottom-20 right-6 z-50 w-80 max-h-[70vh] shadow-xl border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              Dúvidas sobre esta tela
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[50vh] px-4 pb-4">
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <button
                      className="w-full text-left px-3 py-2.5 flex items-center justify-between text-sm font-medium hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <span className="pr-2">{item.title}</span>
                      {expandedId === item.id ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    {expandedId === item.id && (
                      <div className="px-3 pb-3 text-sm text-muted-foreground space-y-2">
                        <p className="leading-relaxed">{item.description}</p>
                        {item.example && (
                          <div className="bg-muted/50 rounded-md p-2 text-xs">
                            <span className="font-medium text-foreground">Exemplo: </span>
                            {item.example}
                          </div>
                        )}
                        {item.link_to && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => {
                              navigate(item.link_to!);
                              setOpen(false);
                            }}
                          >
                            Ir para a tela <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </>
  );
}

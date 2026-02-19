import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";

export function InvoicesTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Baixar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                        <FileText className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">Nenhuma fatura disponível</h3>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        As faturas estarão disponíveis assim que o meio de pagamento for integrado ao sistema.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

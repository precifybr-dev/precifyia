import { PageHeader } from "@/components/layout/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanOverviewTab } from "@/components/plan/PlanOverviewTab";
import { PlansTab } from "@/components/plan/PlansTab";
import { PaymentsTab } from "@/components/plan/PaymentsTab";
import { InvoicesTab } from "@/components/plan/InvoicesTab";

export default function MyPlan() {
  return (
    <>
      <PageHeader title="Planos e Pagamentos" subtitle="Gerencie sua assinatura, compare planos e acompanhe seus pagamentos" />
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview">Meu Plano</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="invoices">Faturas</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <PlanOverviewTab />
          </TabsContent>
          <TabsContent value="plans">
            <PlansTab />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab />
          </TabsContent>
          <TabsContent value="invoices">
            <InvoicesTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

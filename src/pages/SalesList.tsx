import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatMoney,
  formatPercent,
  gatewayLabels,
  getSellerSales,
  moduleNames,
  paymentStatusLabels,
  paymentTypeLabels,
  saleStatusLabels,
} from "@/lib/mockData";

const SalesList = () => {
  const sales = getSellerSales();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Minhas vendas</h1>
        <p className="mt-1 text-muted-foreground">Histórico completo com cronograma dos módulos, pagamentos agendados e comissão por linha.</p>
      </div>

      <div className="space-y-5">
        {sales.map((sale, index) => (
          <motion.div
            key={sale.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <Card className="glass-card">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="text-xl font-display">{sale.clientNames.join(", ")}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{sale.createdAt} • {sale.slots} vaga(s) • {sale.commissionLines.length} evento(s) de comissão</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{saleStatusLabels[sale.status]}</Badge>
                    <Badge variant="secondary">{formatMoney(sale.totalCommissionBRL)}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Valor do contrato</p>
                    <p className="font-medium text-foreground">{formatMoney(sale.contractValue, sale.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Convertido em BRL</p>
                    <p className="font-medium text-foreground">{formatMoney(sale.contractValueBRL)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Recebido</p>
                    <p className="font-medium text-foreground">{formatMoney(sale.totalReceivedBRL)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pendente</p>
                    <p className="font-medium text-foreground">{formatMoney(sale.totalPendingBRL)}</p>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
                  <div className="space-y-3 rounded-3xl border border-border/60 bg-background/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Cronograma dos módulos</p>
                    {sale.moduleSchedules.map((moduleSchedule) => (
                      <div key={`${sale.id}-${moduleSchedule.product}`} className="flex items-center justify-between gap-4 rounded-2xl bg-muted/30 px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-foreground">{moduleNames[moduleSchedule.product]}</p>
                          <p className="text-muted-foreground">Liberação em {moduleSchedule.releaseDate}</p>
                        </div>
                        <p className="font-semibold text-foreground">{formatMoney(moduleSchedule.value, sale.currency)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 rounded-3xl border border-border/60 bg-background/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Linhas de pagamento e comissão</p>
                    {sale.commissionLines.map((line) => (
                      <div key={line.id} className="grid gap-3 rounded-2xl border border-border/50 p-4 md:grid-cols-[1.3fr_0.9fr_0.9fr_0.8fr_0.8fr] md:items-center">
                        <div>
                          <p className="font-medium text-foreground">
                            {paymentTypeLabels[line.paymentType]}
                            {line.installmentNumber ? ` • Parcela ${line.installmentNumber}` : ""}
                          </p>
                          <p className="text-sm text-muted-foreground">{gatewayLabels[line.gateway]} • {line.paymentDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Base</p>
                          <p className="font-medium text-foreground">{formatMoney(line.originalAmount, line.originalCurrency)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Após taxa</p>
                          <p className="font-medium text-foreground">{formatMoney(line.valueAfterTaxBRL)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Taxa</p>
                          <p className="font-medium text-foreground">{formatPercent(line.appliedTaxPercentage)}</p>
                        </div>
                        <div className="flex flex-col gap-2 md:items-end">
                          <Badge variant={line.status === "PAID" ? "default" : "secondary"}>{paymentStatusLabels[line.status]}</Badge>
                          <p className="font-semibold text-primary">{formatMoney(line.finalValueBRL)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SalesList;

import { motion } from "framer-motion";
import { ArrowUpRight, CreditCard, DollarSign, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSellerSummary, formatMoney, paymentTypeLabels, gatewayLabels, saleStatusLabels, moduleNames } from "@/lib/mockData";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const navigate = useNavigate();
  const { sales, totalContractsBRL, totalSlots, totalCommissionBRL, paidAmountBRL, pendingLines } = getSellerSummary();
  const recentSales = sales.slice(0, 3);
  const upcomingLines = sales
    .flatMap((sale) =>
      sale.commissionLines
        .filter((line) => line.status === "PENDING")
        .map((line) => ({ line, clientNames: sale.clientNames }))
    )
    .sort((left, right) => left.line.paymentDate.localeCompare(right.line.paymentDate))
    .slice(0, 4);

  const stats = [
    { label: "Contratos em BRL", value: formatMoney(totalContractsBRL), icon: DollarSign, helper: `${sales.length} venda(s)` },
    { label: "Comissão prevista", value: formatMoney(totalCommissionBRL), icon: CreditCard, helper: "Cálculo completo do pipeline" },
    { label: "Recebido no período", value: formatMoney(paidAmountBRL), icon: Wallet, helper: `${pendingLines} linha(s) pendente(s)` },
    { label: "Vagas vendidas", value: totalSlots.toString(), icon: Users, helper: "Contagem somada das vendas" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard comercial</h1>
          <p className="mt-1 text-muted-foreground">Acompanhe contratos, recebimentos e a comissão estimada por linha de pagamento.</p>
        </div>
        <Button onClick={() => navigate("/nova-venda")} size="lg">
          + Nova venda
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card className="glass-card h-full">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </div>
                <p className="text-xs text-muted-foreground">{stat.helper}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Vendas recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentSales.map((sale) => (
              <div key={sale.id} className="rounded-3xl border border-border/60 bg-background/70 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{sale.clientNames.join(", ")}</p>
                    <p className="text-sm text-muted-foreground">{sale.createdAt} • {sale.slots} vaga(s)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{saleStatusLabels[sale.status]}</Badge>
                    <Badge variant="secondary">{formatMoney(sale.totalCommissionBRL)}</Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Contrato</p>
                    <p className="mt-2 font-semibold text-foreground">{formatMoney(sale.contractValue, sale.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Módulos</p>
                    <p className="mt-2 font-semibold text-foreground">{sale.products.map((product) => moduleNames[product]).join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Recebido</p>
                    <p className="mt-2 font-semibold text-foreground">{formatMoney(sale.totalReceivedBRL)}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Próximas comissões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingLines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma linha pendente no momento.</p>
            ) : (
              upcomingLines.map(({ line, clientNames }) => (
                <div key={line.id} className="rounded-2xl border border-border/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{clientNames.join(", ")}</p>
                      <p className="text-sm text-muted-foreground">
                        {paymentTypeLabels[line.paymentType]}
                        {line.installmentNumber ? ` • Parcela ${line.installmentNumber}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline">{line.paymentDate}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{gatewayLabels[line.gateway]}</span>
                    <span className="font-semibold text-primary">{formatMoney(line.finalValueBRL)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

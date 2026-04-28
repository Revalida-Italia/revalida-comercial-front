import { motion } from "framer-motion";
import { ArrowUpRight, CreditCard, DollarSign, Search, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getSellerSummary, formatMoney, paymentTypeLabels, gatewayLabels, saleStatusLabels, moduleNames, mockSellerProfiles, demoSellerId } from "@/lib/mockData";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import CareerBadge from "@/components/CareerBadge";
import CareerProgressCard from "@/components/CareerProgressCard";
import SellerProgressChart from "@/components/SellerProgressChart";

const Dashboard = () => {
  const navigate = useNavigate();
  const { sales, totalContractsBRL, totalSlots, totalCommissionBRL } = getSellerSummary();
  const [search, setSearch] = useState("");

  const filteredSales = sales.filter((sale) => {
    const q = search.toLowerCase();
    return (
      sale.sellerName.toLowerCase().includes(q) ||
      sale.clientNames.some((name) => name.toLowerCase().includes(q))
    );
  });

  const recentSales = search ? filteredSales : sales.slice(0, 3);

  const profile = mockSellerProfiles.find((p) => p.sellerId === demoSellerId);

  const stats = [
    { label: "Contratos em BRL", value: formatMoney(totalContractsBRL), icon: DollarSign, helper: `${sales.length} venda(s)` },
    { label: "Comissão prevista", value: formatMoney(totalCommissionBRL), icon: CreditCard, helper: "Cálculo completo do pipeline" },
    { label: "Vagas vendidas", value: totalSlots.toString(), icon: Users, helper: "Contagem somada das vendas" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard comercial</h1>
          <p className="mt-1 text-muted-foreground">Acompanhe contratos, recebimentos e a comissão estimada por linha de pagamento.</p>
        </div>
        <div className="flex items-center gap-3">
          <CareerBadge sellerId={demoSellerId} />
          <Button onClick={() => navigate("/nova-venda")} size="lg">
          + Nova venda
          </Button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
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

      {/* Career progress + chart */}
      {profile && (
        <div className="grid gap-6 xl:grid-cols-[0.4fr_0.6fr]">
          <div>
            <h2 className="mb-3 text-lg font-display font-semibold text-foreground">Meu Plano de Carreira</h2>
            <CareerProgressCard profile={profile} highlighted />
          </div>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Progresso mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <SellerProgressChart data={profile.monthlyHistory ?? []} />
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="glass-card">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-display">Vendas recentes</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Filtrar por vendedor ou cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentSales.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma venda encontrada para "{search}".</p>
          ) : (
            recentSales.map((sale) => (
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
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

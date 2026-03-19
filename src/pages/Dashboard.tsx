import { motion } from "framer-motion";
import { TrendingUp, Users, CreditCard, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockSales, currencySymbols } from "@/lib/mockData";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Vendas no Mês", value: mockSales.length.toString(), icon: TrendingUp, trend: "+12%" },
  { label: "Vagas Vendidas", value: mockSales.reduce((a, s) => a + s.slots, 0).toString(), icon: Users, trend: "+8%" },
  { label: "Valor Total", value: "R$ 16.500", icon: DollarSign, trend: "+15%" },
  { label: "Comissão Estimada", value: "R$ 360,75", icon: CreditCard, trend: "" },
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral das suas vendas</p>
        </div>
        <Button onClick={() => navigate("/nova-venda")} size="lg">
          + Nova Venda
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  {stat.trend && (
                    <span className="text-xs font-medium text-success">{stat.trend}</span>
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Vendas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{sale.clientNames.join(", ")}</p>
                  <p className="text-sm text-muted-foreground">{sale.date} • {sale.slots} vaga(s)</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {currencySymbols[sale.currency]} {sale.contractValue.toLocaleString("pt-BR")}
                  </p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    sale.status === "processado" 
                      ? "bg-success/10 text-success" 
                      : "bg-warning/10 text-warning"
                  }`}>
                    {sale.status === "processado" ? "Processado" : "Pendente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

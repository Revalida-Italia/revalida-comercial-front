import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockSales, currencySymbols, paymentTypeLabels, moduleNames } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";

const SalesList = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Minhas Vendas</h1>
        <p className="text-muted-foreground mt-1">Histórico completo de vendas registradas</p>
      </div>

      <div className="space-y-5">
        {mockSales.map((sale, i) => (
          <motion.div
            key={sale.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-display">
                    {sale.clientNames.join(", ")}
                  </CardTitle>
                  <Badge variant={sale.status === "processado" ? "default" : "secondary"}>
                    {sale.status === "processado" ? "Processado" : "Pendente"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-medium text-foreground">{sale.date}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vagas</p>
                    <p className="font-medium text-foreground">{sale.slots}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor do Contrato</p>
                    <p className="font-medium text-foreground">
                      {currencySymbols[sale.currency]} {sale.contractValue.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Comissão</p>
                    <p className="font-medium text-foreground">
                      {sale.commission != null
                        ? `R$ ${sale.commission.toLocaleString("pt-BR")}`
                        : "Aguardando cálculo"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sale.modules.map((m) => (
                    <Badge key={m} variant="outline" className="text-xs">
                      {moduleNames[m]}
                    </Badge>
                  ))}
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Pagamentos</p>
                  <div className="space-y-1">
                    {sale.payments.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">
                          {paymentTypeLabels[p.type]}
                          {p.installments ? ` (${p.installments}x ${currencySymbols[p.currency]} ${p.installmentValue?.toLocaleString("pt-BR")})` : ""}
                        </span>
                        <span className="font-medium text-foreground">
                          {currencySymbols[p.currency]} {p.value.toLocaleString("pt-BR")} — {p.gateway}
                        </span>
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

import { Link } from "react-router-dom";
import type { SaleRecord } from "@/services/commercialApi";
import { formatCurrency, formatDateTime } from "@/shared/utils/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, CircleDollarSign, Users, UserCircle } from "lucide-react";
import {
  getSaleCommissionValue,
  getSaleContractValue,
  getSaleCustomerNames,
  getSaleProductName,
  getSaleSellerInfo,
} from "../utils";

type SaleListCardProps = {
  sale: SaleRecord;
};

const SaleListCard = ({ sale }: SaleListCardProps) => {
  const customerNames = getSaleCustomerNames(sale);
  const contractValue = getSaleContractValue(sale);
  const commissionValue = getSaleCommissionValue(sale);
  const sellerInfo = getSaleSellerInfo(sale);

  return (
    <Link
      to={`/vendas/${sale.id}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
    >
      <Card className="border-border/70 transition-all hover:border-primary/40 hover:shadow-md">
        <CardContent className="p-3.5">
          <div className="grid gap-x-3 gap-y-2 md:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))_auto] md:items-start">
            <div className="space-y-0.5 min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{getSaleProductName(sale)}</p>
              <p className="truncate text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" />{customerNames}</p>
              <p className="truncate text-xs text-muted-foreground flex items-center gap-1"><UserCircle className="h-3.5 w-3.5" />{sellerInfo}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDateTime(sale.createdAt)}</p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Clientes</p>
              <p className="text-xs font-medium">{sale.clients.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pagamentos</p>
              <p className="text-xs font-medium">{sale.payments.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Contrato</p>
              <p className="text-xs font-semibold flex items-center gap-1"><CircleDollarSign className="h-3.5 w-3.5" />{formatCurrency(contractValue, sale.currency || "BRL")}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Comissao total</p>
              <p className="text-xs font-semibold text-primary">{formatCurrency(commissionValue, "BRL")}</p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Badge variant="outline" className="h-6 px-2 text-[10px]">{sale.status}</Badge>
              <span className="text-[11px] font-medium text-primary">Detalhes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default SaleListCard;

import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listGatewayFees } from "@/services/commercialApi";
import { SalesFiltersCardProps } from "../types";

const SalesFiltersCard = ({
  searchTerm,
  gateway,
  onSearchTermChange,
  onGatewayChange,
  onClearFilters,
}: SalesFiltersCardProps) => {
  const { data: gatewayFees = [] } = useQuery({
    queryKey: ["gatewayFees", "active"],
    queryFn: () => listGatewayFees({ includeInactive: false }),
  });

  const hasActiveFilters = searchTerm || gateway;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Filtros</CardTitle>
            <CardDescription>Busque vendas por texto livre ou gateway de pagamento</CardDescription>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="search">Busca livre</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Nome de vendedor ou cliente..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gateway">Gateway de pagamento</Label>
            <Select value={gateway} onValueChange={onGatewayChange}>
              <SelectTrigger id="gateway">
                <SelectValue placeholder="Todos os gateways" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os gateways</SelectItem>
                {gatewayFees.map((item) => (
                  <SelectItem key={item.gateway} value={item.gateway}>
                    {item.gateway}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesFiltersCard;

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
import { cn } from "@/lib/utils";

const SalesFiltersCard = ({
  searchTerm,
  gateway,
  onSearchTermChange,
  onGatewayChange,
  onClearFilters,
  compact = false,
}: SalesFiltersCardProps) => {
  const { data: gatewayFees = [] } = useQuery({
    queryKey: ["gatewayFees", "active"],
    queryFn: () => listGatewayFees({ includeInactive: false }),
  });

  const hasActiveFilters = Boolean(searchTerm) || gateway !== "all";

  if (compact) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-[1_1_70%] bg-muted-foreground/10 rounded-md p-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Buscar por nome, email ou documento..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="h-10 border-border/80 bg-background pl-10 shadow-sm outline-none focus:border-primary/40 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <div className="bg-muted-foreground/10 rounded-md p-2">
          <Select value={gateway} onValueChange={onGatewayChange}>
            <SelectTrigger
              id="gateway"
              className="h-10 w-full shrink-0 border-border/80 shadow-sm outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 sm:w-[200px]"
            >
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

        {hasActiveFilters && (
          <div className="bg-muted-foreground/10 rounded-md p-2">
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-10 shrink-0 px-2">
              <X className="mr-1 h-4 w-4" />
              Limpar
            </Button>
          </div>
        )}
      </div>
    );
  }

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
        <div className={cn("grid gap-4 md:grid-cols-2")}>
          <div className="space-y-2">
            <Label htmlFor="search">Busca livre</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Pesquisa por nome, email ou documento..."
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

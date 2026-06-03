import type { CreateSaleCustomer } from "@/services/commercialApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

type CustomersStepProps = {
  customers: CreateSaleCustomer[];
  canGoNext: boolean;
  onUpdateCustomer: (index: number, field: keyof CreateSaleCustomer, value: string) => void;
  onAddCustomer: () => void;
  onRemoveCustomer: (index: number) => void;
  onNext: () => void;
};

const CustomersStep = ({
  customers,
  canGoNext,
  onUpdateCustomer,
  onAddCustomer,
  onRemoveCustomer,
  onNext,
}: CustomersStepProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Clientes</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {customers.map((customer, index) => (
        <div key={index} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Cliente {index + 1}</span>
            {customers.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => onRemoveCustomer(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={customer.name}
                onChange={(event) => onUpdateCustomer(index, "name", event.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Documento</Label>
              <Input
                value={customer.document ?? ""}
                onChange={(event) => onUpdateCustomer(index, "document", event.target.value)}
                placeholder="CPF, RG, passaporte..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone *</Label>
              <Input
                type="tel"
                value={customer.telefone}
                onChange={(event) => onUpdateCustomer(index, "telefone", event.target.value)}
                placeholder="5534999999999"
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={customer.email ?? ""}
                onChange={(event) => onUpdateCustomer(index, "email", event.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" className="w-full gap-2" onClick={onAddCustomer}>
        <Plus className="h-4 w-4" />
        Adicionar cliente
      </Button>

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} disabled={!canGoNext}>
          Próximo
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default CustomersStep;

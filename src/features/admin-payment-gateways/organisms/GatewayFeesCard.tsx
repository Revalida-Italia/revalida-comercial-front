import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PAYMENT_TYPE_LABELS } from "@/features/new-sale/constants";
import type { GatewayFees, GatewayPaymentOption } from "@/lib/commercialApi";
import { ChevronDown, Pencil } from "lucide-react";

type GatewayFeesCardProps = {
  gateway: GatewayFees;
  isOpen: boolean;
  isEditing: boolean;
  editingOptions?: Record<number, GatewayPaymentOption>;
  isPending: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onFeeRateChange: (optionIndex: number, value: string) => void;
  onIsActiveChange: (optionIndex: number, checked: boolean) => void;
};

const GatewayFeesCard = ({
  gateway,
  isOpen,
  isEditing,
  editingOptions,
  isPending,
  onToggle,
  onEdit,
  onCancel,
  onSave,
  onFeeRateChange,
  onIsActiveChange,
}: GatewayFeesCardProps) => {
  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CardHeader className="px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-1.5">
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CardTitle className="text-lg">{gateway.gateway}</CardTitle>
              <span className="text-xs text-muted-foreground">{gateway.paymentOptions.length} formas</span>
            </div>

            {isEditing ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={onCancel}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button size="sm" className="h-8" onClick={onSave} disabled={isPending}>
                  {isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="h-8" onClick={onEdit}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Button>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="px-4 pb-3 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 text-xs">Forma de pagamento</TableHead>
                  <TableHead className="h-8 text-xs">Taxa (%)</TableHead>
                  <TableHead className="h-8 w-20 text-xs">Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gateway.paymentOptions.map((option, idx) => {
                  const editingValue = isEditing ? editingOptions?.[idx] : option;

                  return (
                    <TableRow key={idx} className="h-10">
                      <TableCell className="py-1.5 text-sm font-medium">
                        {PAYMENT_TYPE_LABELS[option.paymentType] ?? option.paymentType}
                      </TableCell>
                      <TableCell className="py-1.5 text-sm">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={editingValue?.feeRate || ""}
                            onChange={(event) => onFeeRateChange(idx, event.target.value)}
                            className="h-8 w-20"
                          />
                        ) : (
                          `${Number(option.feeRate).toFixed(2)}%`
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 text-sm">
                        {isEditing ? (
                          <Checkbox
                            checked={editingValue?.isActive ?? true}
                            onCheckedChange={(checked) => onIsActiveChange(idx, checked as boolean)}
                          />
                        ) : (
                          <span className={option.isActive !== false ? "text-green-600" : "text-red-600"}>
                            {option.isActive !== false ? "Sim" : "Nao"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default GatewayFeesCard;

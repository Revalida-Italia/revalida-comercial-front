import type { Product } from "@/lib/commercialApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import type { SaleItemDraft } from "../types";

type ProductStepProps = {
  products: Product[];
  productsLoading: boolean;
  items: SaleItemDraft[];
  hasDuplicateProducts: boolean;
  canGoNext: boolean;
  onUpdateItem: (index: number, field: keyof SaleItemDraft, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
};

const ProductStep = ({
  products,
  productsLoading,
  items,
  hasDuplicateProducts,
  canGoNext,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onBack,
  onNext,
}: ProductStepProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Modulos</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {items.map((item, index) => {
        const selectedDate = item.releaseDate ? new Date(`${item.releaseDate}T00:00:00`) : undefined;

        return (
          <div key={index} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Modulo {index + 1}</span>
              {items.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Produto *</Label>
                <Select value={item.productId} onValueChange={(value) => onUpdateItem(index, "productId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={productsLoading ? "Carregando produtos..." : "Selecione um produto"} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => {
                      const selectedElsewhere = items.some((otherItem, otherIndex) => (
                        otherIndex !== index && otherItem.productId === product.id
                      ));

                      return (
                        <SelectItem key={product.id} value={product.id} disabled={selectedElsewhere}>
                        {product.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Data de liberacao *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between font-normal">
                      {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecionar data"}
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => onUpdateItem(index, "releaseDate", date ? format(date, "yyyy-MM-dd") : "")}
                      captionLayout="dropdown"
                      fromYear={new Date().getFullYear() - 1}
                      toYear={new Date().getFullYear() + 10}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        );
      })}

      {hasDuplicateProducts && (
        <p className="text-xs text-destructive">
          Cada modulo deve ser selecionado apenas uma vez.
        </p>
      )}

      <Button variant="outline" size="sm" className="w-full gap-2" onClick={onAddItem}>
        <Plus className="h-4 w-4" />
        Adicionar modulo
      </Button>

      <p className="text-xs text-muted-foreground">
        Defina os modulos da venda e a data de liberacao de cada um.
      </p>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onNext} disabled={!canGoNext}>
          Proximo
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default ProductStep;

import type { Product } from "@/lib/commercialApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProductStepProps = {
  products: Product[];
  productsLoading: boolean;
  productId: string;
  releaseDate: string;
  canGoNext: boolean;
  onProductChange: (value: string) => void;
  onReleaseDateChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
};

const ProductStep = ({
  products,
  productsLoading,
  productId,
  releaseDate,
  canGoNext,
  onProductChange,
  onReleaseDateChange,
  onBack,
  onNext,
}: ProductStepProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Produto</CardTitle>
    </CardHeader>
    <CardContent className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label>Produto *</Label>
        <Select value={productId} onValueChange={onProductChange}>
          <SelectTrigger>
            <SelectValue placeholder={productsLoading ? "Carregando produtos..." : "Selecione um produto"} />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label>Data de liberacao *</Label>
        <Input type="date" value={releaseDate} onChange={(event) => onReleaseDateChange(event.target.value)} />
        <p className="text-xs text-muted-foreground">
          Data em que o produto estara disponivel para o cliente.
        </p>
      </div>

      <div className="md:col-span-2 flex justify-between">
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

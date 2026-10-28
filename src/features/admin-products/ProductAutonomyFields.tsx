import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProductAutonomyFieldsProps = {
  idPrefix: string;
  hotmartProductId: string;
  hotmartOfferCode: string;
  isAutonomy: boolean;
  disabled?: boolean;
  onHotmartProductIdChange: (value: string) => void;
  onHotmartOfferCodeChange: (value: string) => void;
  onIsAutonomyChange: (value: boolean) => void;
};

const ProductAutonomyFields = ({
  idPrefix,
  hotmartProductId,
  hotmartOfferCode,
  isAutonomy,
  disabled = false,
  onHotmartProductIdChange,
  onHotmartOfferCodeChange,
  onIsAutonomyChange,
}: ProductAutonomyFieldsProps) => {
  const productIdField = `${idPrefix}-hotmart-product-id`;
  const offerField = `${idPrefix}-hotmart-offer-code`;
  const autonomyField = `${idPrefix}-is-autonomy`;

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={productIdField}>ID do produto na Hotmart (opcional)</Label>
        <Input
          id={productIdField}
          value={hotmartProductId}
          onChange={(event) => onHotmartProductIdChange(event.target.value)}
          placeholder="Ex: 1234567"
          autoComplete="off"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">Único no cadastro. Deixe em branco se o produto não usa Hotmart.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={offerField}>Código da oferta Hotmart (opcional)</Label>
        <Input
          id={offerField}
          value={hotmartOfferCode}
          onChange={(event) => onHotmartOfferCodeChange(event.target.value)}
          placeholder="Ex: abc123"
          autoComplete="off"
          disabled={disabled}
        />
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id={autonomyField}
          checked={isAutonomy}
          onCheckedChange={(checked) => onIsAutonomyChange(checked === true)}
          disabled={disabled}
        />
        <div className="grid gap-1">
          <Label htmlFor={autonomyField}>Produto Autonomy</Label>
          <p className="text-xs text-muted-foreground">Venda self-service, sem vendedor.</p>
        </div>
      </div>
    </>
  );
};

export default ProductAutonomyFields;

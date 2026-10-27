import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProduct } from "@/services/productsApi";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ProductAutonomyFields from "./ProductAutonomyFields";
import { buildCreateProductInput } from "./productPayload";

const AdminProductCreateFeature = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hotmartProductId, setHotmartProductId] = useState("");
  const [hotmartOfferCode, setHotmartOfferCode] = useState("");
  const [isAutonomy, setIsAutonomy] = useState(false);

  const createProductMutation = useMutation({
    mutationFn: async () => {
      const normalizedName = name.trim();
      const normalizedDescription = description.trim();

      if (!normalizedName) {
        throw new Error("Informe o nome do produto.");
      }

      await createProduct(buildCreateProductInput({
        name: normalizedName,
        description: normalizedDescription,
        hotmartProductId,
        hotmartOfferCode,
        isAutonomy,
      }));
    },
    onSuccess: () => {
      toast.success("Produto criado com sucesso.");
      navigate("/admin/products", { replace: true });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao criar produto.";
      toast.error(message);
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createProductMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo Produto</CardTitle>
        <CardDescription>Preencha os dados basicos para cadastrar um produto.</CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="product-name">Nome</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Mentoria Premium"
              disabled={createProductMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-description">Descricao (opcional)</Label>
            <Input
              id="product-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex: Produto para trilha premium"
              disabled={createProductMutation.isPending}
            />
          </div>

          <ProductAutonomyFields
            idPrefix="product"
            hotmartProductId={hotmartProductId}
            hotmartOfferCode={hotmartOfferCode}
            isAutonomy={isAutonomy}
            disabled={createProductMutation.isPending}
            onHotmartProductIdChange={setHotmartProductId}
            onHotmartOfferCodeChange={setHotmartOfferCode}
            onIsAutonomyChange={setIsAutonomy}
          />

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={createProductMutation.isPending}>
              {createProductMutation.isPending ? "Salvando..." : "Salvar produto"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/products")}
              disabled={createProductMutation.isPending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminProductCreateFeature;

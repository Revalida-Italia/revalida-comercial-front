import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteProduct, listProducts, updateProduct, type Product, type UpdateProductInput } from "@/services/productsApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ProductAutonomyFields from "./ProductAutonomyFields";
import { buildProductUpdateInput, hotmartCheckoutUrlError } from "./productPayload";

const AdminProductsFeature = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editHotmartProductId, setEditHotmartProductId] = useState("");
  const [editHotmartCheckoutUrl, setEditHotmartCheckoutUrl] = useState("");
  const [editHotmartOfferCode, setEditHotmartOfferCode] = useState("");
  const [editIsAutonomy, setEditIsAutonomy] = useState(false);
  const [checkoutUrlSubmitted, setCheckoutUrlSubmitted] = useState(false);
  const checkoutUrlError = checkoutUrlSubmitted ? hotmartCheckoutUrlError(editHotmartCheckoutUrl) : null;
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const productsQuery = useQuery({
    queryKey: ["adminProducts"],
    queryFn: listProducts,
  });

  const updateProductMutation = useMutation({
    mutationFn: async (payload: { id: string; input: UpdateProductInput }) => {
      await updateProduct(payload.id, payload.input);
    },
    onSuccess: async () => {
      toast.success("Produto atualizado com sucesso.");
      setEditingProduct(null);
      await queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao atualizar produto.";
      toast.error(message);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteProduct(id);
    },
    onSuccess: async () => {
      toast.success("Produto excluido com sucesso.");
      setDeletingProduct(null);
      await queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao excluir produto.";
      toast.error(message);
    },
  });

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name ?? "");
    setEditDescription(product.description ?? "");
    setEditHotmartProductId(product.hotmartProductId ?? "");
    setEditHotmartCheckoutUrl(product.hotmartCheckoutUrl ?? "");
    setEditHotmartOfferCode(product.hotmartOfferCode ?? "");
    setEditIsAutonomy(Boolean(product.isAutonomy));
    setCheckoutUrlSubmitted(false);
  };

  const handleEditSubmit = () => {
    if (!editingProduct) {
      return;
    }

    if (!editName.trim()) {
      toast.error("Nome do produto e obrigatorio.");
      return;
    }

    setCheckoutUrlSubmitted(true);
    const urlError = hotmartCheckoutUrlError(editHotmartCheckoutUrl);
    if (urlError) {
      toast.error(urlError);
      return;
    }

    const payload: UpdateProductInput = buildProductUpdateInput(editingProduct, {
      name: editName,
      description: editDescription,
      hotmartProductId: editHotmartProductId,
      hotmartCheckoutUrl: editHotmartCheckoutUrl,
      hotmartOfferCode: editHotmartOfferCode,
      isAutonomy: editIsAutonomy,
    });

    if (Object.keys(payload).length === 0) {
      toast.info("Nenhuma alteracao para salvar.");
      return;
    }

    updateProductMutation.mutate({ id: editingProduct.id, input: payload });
  };

  return (
    <>
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package2 className="h-4 w-4 text-primary" />
            Lista de Produtos
          </CardTitle>
          <Button onClick={() => navigate("/admin/products/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar novo produto
          </Button>
        </CardHeader>

        <CardContent>
        {productsQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando produtos...</p>}

        {productsQuery.isError && (
          <p className="text-sm text-destructive">
            Erro ao carregar produtos: {(productsQuery.error as Error).message}
          </p>
        )}

        {!productsQuery.isLoading && !productsQuery.isError && (productsQuery.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
        )}

        {!productsQuery.isLoading && !productsQuery.isError && (productsQuery.data ?? []).length > 0 && (
          <div className="grid gap-3">
            {(productsQuery.data ?? []).map((product) => (
              <div
                key={product.id}
                className="rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg border border-primary/30 bg-primary/10 p-1.5 text-primary">
                        <Package2 className="h-4 w-4" />
                      </div>
                      <h3 className="truncate font-semibold text-foreground">{product.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{product.description || "Sem descricao cadastrada."}</p>
                    {(product.isAutonomy || product.hotmartProductId || product.hotmartCheckoutUrl || product.hotmartOfferCode) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {product.isAutonomy && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Autonomy</Badge>
                        )}
                        {product.hotmartProductId && (
                          <span className="text-xs text-muted-foreground">Hotmart {product.hotmartProductId}</span>
                        )}
                        {product.hotmartCheckoutUrl && (
                          <ProductCheckoutUrl url={product.hotmartCheckoutUrl} />
                        )}
                        {product.hotmartOfferCode && (
                          <span className="text-xs text-muted-foreground">Oferta {product.hotmartOfferCode}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-primary/35 text-primary hover:bg-primary/10 hover:text-primary"
                      onClick={() => openEditDialog(product)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeletingProduct(product)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingProduct)} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
            <DialogDescription>Atualize os dados e salve para aplicar as alteracoes.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-product-name">Nome</Label>
              <Input
                id="edit-product-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                disabled={updateProductMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-product-description">Descricao</Label>
              <Textarea
                id="edit-product-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={3}
                disabled={updateProductMutation.isPending}
              />
            </div>

            <ProductAutonomyFields
              idPrefix="edit-product"
              hotmartProductId={editHotmartProductId}
              hotmartCheckoutUrl={editHotmartCheckoutUrl}
              hotmartCheckoutUrlError={checkoutUrlError}
              hotmartOfferCode={editHotmartOfferCode}
              isAutonomy={editIsAutonomy}
              disabled={updateProductMutation.isPending}
              onHotmartProductIdChange={setEditHotmartProductId}
              onHotmartCheckoutUrlChange={setEditHotmartCheckoutUrl}
              onHotmartOfferCodeChange={setEditHotmartOfferCode}
              onIsAutonomyChange={setEditIsAutonomy}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)} disabled={updateProductMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateProductMutation.isPending}>
              {updateProductMutation.isPending ? "Salvando..." : "Salvar alteracoes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingProduct)} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir <b>{deletingProduct?.name || "este produto"}</b>? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProductMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteProductMutation.isPending || !deletingProduct}
              onClick={() => {
                if (deletingProduct) {
                  deleteProductMutation.mutate(deletingProduct.id);
                }
              }}
            >
              {deleteProductMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

function ProductCheckoutUrl({ url }: { url: string }) {
  const trimmed = url.trim();
  let safeHref: string | null = null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      safeHref = parsed.href;
    }
  } catch {
    safeHref = null;
  }

  if (!safeHref) {
    return <span className="min-w-0 basis-full break-all text-xs text-muted-foreground">{trimmed}</span>;
  }

  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      title={safeHref}
      className="min-w-0 basis-full break-all text-xs text-primary underline-offset-2 hover:underline"
    >
      {trimmed}
    </a>
  );
}

export default AdminProductsFeature;

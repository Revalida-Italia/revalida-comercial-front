import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
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
import type { CostCategory, CreateCostCategoryInput, UpdateCostCategoryInput } from "@/features/costs-calendar/types";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type CostCategoriesDialogProps = {
  open: boolean;
  categories: CostCategory[];
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CreateCostCategoryInput) => void;
  onUpdate: (id: string, payload: UpdateCostCategoryInput) => void;
  onDelete: (id: string) => void;
};

const CostCategoriesDialog = ({
  open,
  categories,
  isLoading,
  isCreating,
  isUpdating,
  isDeleting,
  onOpenChange,
  onCreate,
  onUpdate,
  onDelete,
}: CostCategoriesDialogProps) => {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#0c3559");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("#0c3559");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const pending = isCreating || isUpdating || isDeleting;

  const startEdit = (category: CostCategory) => {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingColor(category.color || "#0c3559");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingColor("#0c3559");
  };

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    onCreate({
      name: newName.trim(),
      color: newColor,
    });

    setNewName("");
    setNewColor("#0c3559");
  };

  const handleSaveEdit = () => {
    if (!editingId) {
      return;
    }

    if (!editingName.trim()) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    onUpdate(editingId, {
      name: editingName.trim(),
      color: editingColor,
    });
    cancelEdit();
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteId) {
      return;
    }
    onDelete(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  return (
    <Fragment>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar categorias</DialogTitle>
          <DialogDescription>Crie, edite ou exclua categorias utilizadas nos custos.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
            <p className="mb-2 text-sm font-medium">Nova categoria</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_110px_auto]">
              <div className="grid gap-1.5">
                <Label htmlFor="new-category-name">Nome</Label>
                <Input
                  id="new-category-name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Ex.: Infraestrutura"
                  disabled={pending}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="new-category-color">Cor</Label>
                <Input
                  id="new-category-color"
                  type="color"
                  value={newColor}
                  onChange={(event) => setNewColor(event.target.value)}
                  className="h-10 p-1"
                  disabled={pending}
                />
              </div>

              <div className="flex items-end">
                <Button className="w-full gap-2" onClick={handleCreate} disabled={pending}>
                  <Plus className="h-4 w-4" />
                  Criar
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando categorias...</p>}

            {!isLoading && categories.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nenhuma categoria cadastrada.
              </p>
            )}

            {!isLoading && categories.length > 0 && (
              <div className="space-y-2">
                {categories.map((category) => {
                  const isEditing = editingId === category.id;

                  return (
                    <div key={category.id} className="rounded-lg border border-border/80 bg-card/70 p-3">
                      {isEditing ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_110px_auto]">
                          <Input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            disabled={pending}
                          />
                          <Input
                            type="color"
                            value={editingColor}
                            onChange={(event) => setEditingColor(event.target.value)}
                            className="h-10 p-1"
                            disabled={pending}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={cancelEdit} disabled={pending}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="icon" onClick={handleSaveEdit} disabled={pending}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color || "#0c3559" }} />
                            <p className="text-sm font-medium">{category.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => startEdit(category)} disabled={pending}>
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDelete(category.id)}
                              disabled={pending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={Boolean(confirmDeleteId)} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja realmente excluir esta categoria? Essa acao nao pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
            {isDeleting ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </Fragment>
  );
};

export default CostCategoriesDialog;

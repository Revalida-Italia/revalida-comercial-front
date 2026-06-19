import { Fragment, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  CostCategory,
  CostsCalendarEvent,
  CreateCostEventInput,
  RecurrenceType,
  UpdateCostEventInput,
} from "@/features/costs-calendar/types";
import { RECURRENCE_TYPE_LABELS } from "@/features/costs-calendar/utils";
import { formatCurrency } from "@/shared/utils/format";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

type CostEventDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  categories: CostCategory[];
  initialDate?: string;
  event?: CostsCalendarEvent | null;
  isSubmitting: boolean;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CreateCostEventInput) => void;
  onUpdate: (costId: string, payload: UpdateCostEventInput) => void;
  onDelete: (costId: string) => void;
};

const DEFAULT_RECURRENCE_TYPE: RecurrenceType = "MONTHLY";

const CostEventDialog = ({
  open,
  mode,
  categories,
  initialDate,
  event,
  isSubmitting,
  isDeleting,
  onOpenChange,
  onCreate,
  onUpdate,
  onDelete,
}: CostEventDialogProps) => {
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(DEFAULT_RECURRENCE_TYPE);
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && event) {
      setCategoryId(event.category.id);
      setTitle(event.title);
      setAmount(String(event.amount));
      setDescription(event.description ?? "");
      setStartDate(event.scheduledDate.slice(0, 10));
      setEndDate("");
      setIsRecurring(event.isRecurring);
      setRecurrenceType((event.recurrenceType as RecurrenceType) ?? DEFAULT_RECURRENCE_TYPE);
      setRecurrenceInterval("1");
      return;
    }

    setCategoryId(categories[0]?.id ?? "");
    setTitle("");
    setAmount("");
    setDescription("");
    setStartDate(initialDate || format(new Date(), "yyyy-MM-dd"));
    setEndDate("");
    setIsRecurring(false);
    setRecurrenceType(DEFAULT_RECURRENCE_TYPE);
    setRecurrenceInterval("1");
  }, [open, mode, event, categories, initialDate]);

  const amountPreview = useMemo(() => {
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount)) {
      return "-";
    }
    return formatCurrency(numericAmount);
  }, [amount]);

  const handleSubmit = () => {
    const numericAmount = Number(amount);
    const numericInterval = Number(recurrenceInterval || "1");

    if (!categoryId || !title.trim() || !startDate || Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Preencha categoria, titulo, valor e data inicial.");
      return;
    }

    if (isRecurring && (!recurrenceType || Number.isNaN(numericInterval) || numericInterval < 1)) {
      toast.error("Para recorrencia, selecione o tipo e um intervalo valido.");
      return;
    }

    const payload: UpdateCostEventInput = {
      categoryId,
      title: title.trim(),
      amount: numericAmount,
      startDate,
      description: description.trim() || undefined,
      endDate: endDate || undefined,
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType : undefined,
      recurrenceInterval: isRecurring ? numericInterval : undefined,
    };

    if (mode === "edit" && event?.costId) {
      onUpdate(event.costId, payload);
      return;
    }

    onCreate(payload as CreateCostEventInput);
  };

  const handleDelete = () => {
    if (!event?.costId) {
      return;
    }
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!event?.costId) {
      return;
    }
    onDelete(event.costId);
  };

  const isPending = isSubmitting || isDeleting;

  return (
    <Fragment>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar custo" : "Criar custo"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Atualize os dados do custo e salve as alteracoes."
              : "Preencha os dados para adicionar um novo custo no calendario."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cost-category">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="cost-category">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cost-title">Titulo</Label>
            <Input id="cost-title" value={title} onChange={(event) => setTitle(event.target.value)} disabled={isPending} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cost-amount">Valor</Label>
              <Input
                id="cost-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">Preview: {amountPreview}</p>
            </div>

            <div className="grid gap-2">
              <Label>Data inicial</Label>
              <DatePicker value={startDate} onChange={setStartDate} disabled={isPending} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cost-description">Descricao</Label>
            <Textarea
              id="cost-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isPending}
            />
          </div>

          {mode === "edit" && (
            <div className="grid gap-2">
              <Label>Data final (opcional)</Label>
              <DatePicker value={endDate} onChange={setEndDate} disabled={isPending} placeholder="Sem data final" />
            </div>
          )}

          <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="cost-is-recurring" className="cursor-pointer">
                Recorrente
              </Label>
              <Switch
                id="cost-is-recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
                disabled={isPending}
              />
            </div>

            {isRecurring && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="cost-recurrence-type">Tipo</Label>
                  <Select value={recurrenceType} onValueChange={(value) => setRecurrenceType(value as RecurrenceType)}>
                    <SelectTrigger id="cost-recurrence-type">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RECURRENCE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cost-recurrence-interval">Intervalo</Label>
                  <Input
                    id="cost-recurrence-interval"
                    type="number"
                    min="1"
                    value={recurrenceInterval}
                    onChange={(event) => setRecurrenceInterval(event.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {mode === "edit" && (
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || categories.length === 0}>
              {isSubmitting ? "Salvando..." : mode === "edit" ? "Salvar alteracoes" : "Criar custo"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir custo</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja realmente excluir <b>{event?.title || "este custo"}</b>? Essa acao nao pode ser desfeita.
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

export default CostEventDialog;

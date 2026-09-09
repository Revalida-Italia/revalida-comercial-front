import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CostsCalendarEvent } from "@/features/costs-calendar/types";
import { formatSaleExchangeRateLabel } from "@/shared/utils/exchange";
import { formatCurrency } from "@/shared/utils/format";
import { CalendarDays, Pencil, Repeat2, Tag } from "lucide-react";

type EventDetailsDialogProps = {
  open: boolean;
  event: CostsCalendarEvent | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (event: CostsCalendarEvent) => void;
};

function formatEventDate(dateIso: string): string {
  const rawDate = dateIso.slice(0, 10);
  const [year, month, day] = rawDate.split("-");

  if (!year || !month || !day) {
    return rawDate;
  }

  return `${day}/${month}/${year}`;
}

const EventDetailsDialog = ({ open, event, onOpenChange, onEdit }: EventDetailsDialogProps) => {
  const fxLabel = event ? formatSaleExchangeRateLabel(event) : null;
  const originalCurrency = event?.originalCurrency && event.originalCurrency !== "BRL"
    ? event.originalCurrency
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {event?.source === "CASH_MOVEMENT" ? "Detalhes da movimentação" : "Detalhes do custo"}
          </DialogTitle>
          <DialogDescription>Visualize os dados do evento selecionado.</DialogDescription>
        </DialogHeader>

        {!event ? (
          <p className="text-sm text-muted-foreground">Evento nao encontrado.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
              <p className="text-sm font-semibold">{event.title}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: event.category.color || "#0c3559" }} />
                <span>{event.category.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/80 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  Valor
                </div>
                <p className="mt-1 text-base font-semibold">{formatCurrency(event.amount)}</p>
                {event.source === "CASH_MOVEMENT" && originalCurrency && event.originalAmount != null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Digitado: {formatCurrency(event.originalAmount, originalCurrency)}
                    {fxLabel ? ` · ${fxLabel}` : ""}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border/80 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Data agendada
                </div>
                <p className="mt-1 text-base font-semibold">{formatEventDate(event.scheduledDate)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Repeat2 className="h-3.5 w-3.5" />
                Recorrencia
              </div>
              <p className="mt-1 text-sm font-medium">{event.isRecurring ? "Sim" : "Nao"}</p>
            </div>

            <div className="rounded-lg border border-border/80 p-3">
              <p className="text-xs text-muted-foreground">Descricao</p>
              <p className="mt-1 text-sm">{event.description?.trim() || "Sem descricao cadastrada."}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {event && event.source !== "CASH_MOVEMENT" ? (
            <Button className="gap-2" onClick={() => onEdit(event)}>
              <Pencil className="h-4 w-4" />
              Editar custo
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsDialog;

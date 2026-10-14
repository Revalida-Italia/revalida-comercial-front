import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listPaymentWebhookEvents,
  resolvePaymentWebhookEvent,
  type PaymentWebhookEvent,
  type SecondSettledCharge,
  type PaymentWebhookProvider,
  type PaymentWebhookStatus,
} from "@/services/paymentLinksApi";
import { PAYMENT_WEBHOOK_PAGE_SIZE } from "./constants";
import {
  formatWebhookAmount,
  formatWebhookAmountMismatch,
  formatWebhookDateTime,
  formatStripeObjectType,
  formatWebhookProvider,
  formatWebhookReason,
  formatWebhookStatus,
  webhookErrorMessage,
} from "./formatWebhookEvent";

type StatusFilter = PaymentWebhookStatus | "all";
type ProviderFilter = PaymentWebhookProvider | "all";
type ResolvedFilter = "true" | "false" | "all";

const selectClassName = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function CopyableId({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <code className="break-all text-xs">{value}</code>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 shrink-0 px-1"
        aria-label={`Copiar ${label}`}
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast.success("Identificador copiado.");
        }}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

function ChargeId({ label, value }: { label: string; value: string }) {
  return (
    <>
      <code className="break-all text-xs text-foreground">{value}</code>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 shrink-0 px-1"
        aria-label={`Copiar ${label}`}
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast.success("Identificador copiado.");
        }}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </>
  );
}

function SecondSettledChargeLine({ charge }: { charge: SecondSettledCharge }) {
  const hasPrevious = Boolean(charge.previousPaymentIntentId || charge.previousSessionId);
  const hasCurrent = Boolean(charge.paymentIntentId || charge.sessionId);
  if (!hasPrevious && !hasCurrent) {
    return null;
  }

  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      {hasPrevious && (
        <p className="flex flex-wrap items-center gap-1">
          <span>Cobrança anterior:</span>
          {charge.previousPaymentIntentId && (
            <ChargeId label="cobrança anterior" value={charge.previousPaymentIntentId} />
          )}
          {charge.previousSessionId && (
            <>
              <span>(sessão</span>
              <ChargeId label="sessão anterior" value={charge.previousSessionId} />
              <span>)</span>
            </>
          )}
        </p>
      )}
      {hasCurrent && (
        <p className="flex flex-wrap items-center gap-1">
          <span>Cobrança atual:</span>
          {charge.paymentIntentId && (
            <ChargeId label="cobrança atual" value={charge.paymentIntentId} />
          )}
          {charge.sessionId && (
            <>
              <span>(sessão</span>
              <ChargeId label="sessão atual" value={charge.sessionId} />
              <span>)</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}

function eventIdentifiers(event: PaymentWebhookEvent) {
  const stripeObject = event.stripeObjectId
    ? { label: formatStripeObjectType(event.stripeObjectType), value: event.stripeObjectId }
    : event.stripeSessionId
      ? { label: formatStripeObjectType("checkout.session"), value: event.stripeSessionId }
      : null;

  return [
    { label: "evento", value: event.eventId ?? event.id },
    stripeObject,
    event.stripePaymentIntentId && event.stripePaymentIntentId !== stripeObject?.value
      ? { label: "Pagamento (PaymentIntent)", value: event.stripePaymentIntentId }
      : null,
    { label: "transação Hotmart", value: event.hotmartTransaction },
    { label: "xcod", value: event.hotmartXcod },
  ].filter((item): item is { label: string; value: string } => Boolean(item?.value));
}

const PaymentWebhookEventsFeature = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("UNMATCHED");
  const [provider, setProvider] = useState<ProviderFilter>("all");
  const [resolved, setResolved] = useState<ResolvedFilter>("false");
  const [page, setPage] = useState(1);
  const [resolving, setResolving] = useState<PaymentWebhookEvent | null>(null);
  const [note, setNote] = useState("");
  const [resolveError, setResolveError] = useState<string | null>(null);

  const query = {
    status: status === "all" ? undefined : status,
    provider: provider === "all" ? undefined : provider,
    resolved: resolved === "all" ? undefined : resolved === "true",
    page,
    pageSize: PAYMENT_WEBHOOK_PAGE_SIZE,
  };

  const eventsQuery = useQuery({
    queryKey: ["payment-webhook-events", query],
    queryFn: () => listPaymentWebhookEvents(query),
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!resolving) {
        throw new Error("Selecione um evento.");
      }

      return resolvePaymentWebhookEvent(resolving.id, { note });
    },
    onSuccess: async (event) => {
      toast.success("Evento marcado como resolvido.");
      setResolving(null);
      setNote("");
      setResolveError(null);
      queryClient.setQueriesData<{ items: PaymentWebhookEvent[] }>(
        { queryKey: ["payment-webhook-events"] },
        (current) => {
          if (!current?.items) {
            return current;
          }

          return {
            ...current,
            items: current.items.map((item) => (item.id === event.id ? event : item)),
          };
        },
      );
      await queryClient.invalidateQueries({ queryKey: ["payment-webhook-events"] });
    },
    onError: (error: unknown) => {
      setResolveError(webhookErrorMessage(error, "Erro ao marcar o evento como resolvido."));
    },
  });

  const data = eventsQuery.data;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize || PAYMENT_WEBHOOK_PAGE_SIZE)));

  function updateFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="webhook-provider">Provedor</Label>
          <select
            id="webhook-provider"
            className={selectClassName}
            value={provider}
            onChange={(event) => updateFilter(setProvider, event.target.value as ProviderFilter)}
          >
            <option value="all">Todos os provedores</option>
            <option value="STRIPE">Stripe</option>
            <option value="HOTMART">Hotmart</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="webhook-status">Status</Label>
          <select
            id="webhook-status"
            className={selectClassName}
            value={status}
            onChange={(event) => updateFilter(setStatus, event.target.value as StatusFilter)}
          >
            <option value="UNMATCHED">Não conciliados</option>
            <option value="PROCESSED">Processados</option>
            <option value="IGNORED">Ignorados</option>
            <option value="ERROR">Erros</option>
            <option value="all">Todos os status</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="webhook-resolved">Resolução</Label>
          <select
            id="webhook-resolved"
            className={selectClassName}
            value={resolved}
            onChange={(event) => updateFilter(setResolved, event.target.value as ResolvedFilter)}
          >
            <option value="false">Não resolvidos</option>
            <option value="true">Resolvidos</option>
            <option value="all">Todos</option>
          </select>
        </div>
      </div>

      {eventsQuery.isLoading && (
        <p className="text-sm text-muted-foreground" role="status">Carregando eventos...</p>
      )}

      {eventsQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          {webhookErrorMessage(eventsQuery.error, "Erro ao carregar eventos de pagamento.")}
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum evento de pagamento encontrado.</p>
      )}

      {data && data.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provedor</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Identificadores</TableHead>
              <TableHead>Venda</TableHead>
              <TableHead>Pagamentos</TableHead>
              <TableHead>Resolução</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((event) => (
              <TableRow key={event.id}>
                <TableCell>{formatWebhookProvider(event.provider)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p>{formatWebhookReason(event.reason)}</p>
                    {event.reason === "second_settled_charge" && event.secondSettledCharge && (
                      <SecondSettledChargeLine charge={event.secondSettledCharge} />
                    )}
                    <Badge variant="outline">{formatWebhookStatus(event.status)}</Badge>
                  </div>
                </TableCell>
                <TableCell>{formatWebhookDateTime(event.receivedAt ?? event.createdAt)}</TableCell>
                <TableCell>
                  {formatWebhookAmountMismatch(event) ?? formatWebhookAmount(event.amount, event.currency)}
                </TableCell>
                <TableCell className="break-all">{event.buyerEmail || "—"}</TableCell>
                <TableCell className="min-w-52 space-y-1">
                  {eventIdentifiers(event).map((item) => (
                    <CopyableId key={`${event.id}-${item.label}`} label={item.label} value={item.value} />
                  ))}
                </TableCell>
                <TableCell>
                  {event.saleId ? (
                    <Link className="text-sm text-primary underline" to={`/vendas/${event.saleId}`}>
                      Ver venda
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <span aria-label="Pagamentos marcados">{event.markedPaymentIds.length}</span>
                </TableCell>
                <TableCell className="min-w-44">
                  {event.resolvedAt ? (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Resolvido em {formatWebhookDateTime(event.resolvedAt)}</p>
                      {event.resolvedBy && <p>Por {event.resolvedBy}</p>}
                      {event.resolutionNote && <p>Nota: {event.resolutionNote}</p>}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setResolving(event);
                        setNote("");
                        setResolveError(null);
                      }}
                    >
                      Marcar como resolvido
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Página {data.page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || eventsQuery.isFetching}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= totalPages || eventsQuery.isFetching}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(resolving)}
        onOpenChange={(open) => {
          if (!open && !resolveMutation.isPending) {
            setResolving(null);
            setResolveError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como resolvido</DialogTitle>
            <DialogDescription>
              A nota é opcional e pode ter até 2000 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="webhook-resolution-note">Nota</Label>
            <Textarea
              id="webhook-resolution-note"
              value={note}
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nota opcional"
            />
            <p className="text-xs text-muted-foreground">{note.length}/2000</p>
          </div>
          {resolveError && (
            <p role="alert" className="text-sm text-destructive">{resolveError}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setResolving(null)}
              disabled={resolveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => resolveMutation.mutate()}
              disabled={resolveMutation.isPending}
            >
              {resolveMutation.isPending ? "Salvando..." : "Marcar como resolvido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentWebhookEventsFeature;

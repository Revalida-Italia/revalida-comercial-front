import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SectionHeading, FieldError } from "@/features/contracts/contractFormParts";
import { formatCurrency, formatDate } from "@/shared/utils/format";

export interface PaymentPhase {
  number: number;
  name: string;
  amount: number;
  /** Equal parcels this line stands for (card installments). */
  installments?: number;
  dueDateOrTrigger: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Dated installments first, in date order; undated ones at the end. */
export function sortPhases<T extends PaymentPhase>(phases: T[]): T[] {
  return [...phases].sort((a, b) => {
    const da = ISO_DATE.test(a.dueDateOrTrigger) ? a.dueDateOrTrigger : "9999-99-99";
    const db = ISO_DATE.test(b.dueDateOrTrigger) ? b.dueDateOrTrigger : "9999-99-99";
    return da === db ? a.number - b.number : da < db ? -1 : 1;
  });
}

/** Generic names ("Assinatura 5", "Parcela 3") are renumbered in date order; "Entrada" and the like stay. */
export function displayPhaseNames(sorted: PaymentPhase[]): string[] {
  let counter = 0;
  return sorted.map((phase) => {
    if (/^(Assinatura|Parcela) \d+$/.test(phase.name)) {
      counter += 1;
      return `Parcela ${counter}`;
    }
    return phase.name;
  });
}

export function phaseDueLabel(value: string, installments = 1): string {
  if (!ISO_DATE.test(value)) return "Sem data definida";
  return installments > 1 ? `a partir de ${formatDate(value)}` : formatDate(value);
}

export default function ContractPaymentSection({
  number,
  saleId,
  phases,
  total,
  currency = "BRL",
  error,
}: {
  number: number;
  saleId: string;
  phases: PaymentPhase[];
  total: number;
  currency?: string;
  error: string | null;
}) {
  const sorted = sortPhases(phases);
  const names = displayPhaseNames(sorted);
  const parcels = (phase: PaymentPhase) => (phase.installments && phase.installments > 1 ? phase.installments : 1);

  return (
    <section id="contract-section-payment" tabIndex={-1} className="outline-none" aria-labelledby="contract-payment-title">
      <SectionHeading number={number} title="Pagamento" id="contract-payment-title" />

      {sorted.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Cadastre o pagamento da venda para gerar o contrato.</p>
          <Button asChild variant="outline" size="sm">
            <Link to={`/vendas/${saleId}`}>Ir para a venda</Link>
          </Button>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-[13px] text-muted-foreground">
            Para mudar valores, altere o pagamento da venda.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[13px] text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">Parcela</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Valor</th>
                <th scope="col" className="py-2 text-right font-medium">Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((phase, index) => (
                <tr key={`${phase.number}-${phase.name}`} className="border-b border-border/60 last:border-b-0">
                  <td className="py-2.5 pr-4">{parcels(phase) > 1 ? `${parcels(phase)} parcelas` : names[index]}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {formatCurrency(phase.amount, currency)}
                    {parcels(phase) > 1 ? " cada" : ""}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{phaseDueLabel(phase.dueDateOrTrigger, parcels(phase))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-semibold tabular-nums">{formatCurrency(total, currency)}</span>
          </div>
          <FieldError fieldId="contract-section-payment" message={error} />
          {error && (
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to={`/vendas/${saleId}`}>Ir para a venda</Link>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

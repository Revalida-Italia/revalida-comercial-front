import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormIssue } from "@/features/contracts/contractFormModel";
import { focusField } from "@/features/contracts/contractFormParts";
import { cn } from "@/lib/utils";

export interface SummaryRow {
  label: string;
  value: string;
}

export interface ContractSummaryProps {
  totalLabel: string;
  contractors: string;
  /** Revalida only. */
  included?: string[];
  notIncluded?: string[];
  /** Rows such as "Início do curso", used by the school contract. */
  rows?: SummaryRow[];
  /** End of the term, dd/mm/aaaa. */
  termLabel?: string | null;
  /** Start of the term, dd/mm/aaaa. */
  termStartLabel?: string | null;
  issues: FormIssue[];
  banner: string | null;
  generating: boolean;
  /** Where the Gerar contrato button is drawn: inside the panel, or in the sticky bar on small screens. */
  stickyBar: boolean;
  onGenerate: () => void;
}

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-[13px] font-medium text-muted-foreground">{title}</h3>
      <ul className="mt-1 space-y-0.5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function GenerateButton({
  issues,
  generating,
  onGenerate,
  className,
}: {
  issues: FormIssue[];
  generating: boolean;
  onGenerate: () => void;
  className?: string;
}) {
  const blocked = issues.length > 0;
  return (
    <Button
      type="button"
      size="lg"
      className={cn("w-full", blocked && !generating && "cursor-not-allowed opacity-50", className)}
      aria-disabled={blocked || generating}
      onClick={() => {
        if (generating) return;
        onGenerate();
      }}
    >
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {generating ? "Gerando…" : "Gerar contrato"}
    </Button>
  );
}

export default function ContractSummary(props: ContractSummaryProps) {
  const { issues, banner, generating, stickyBar, onGenerate } = props;

  return (
    <>
      <aside
        aria-label="Resumo"
        className="rounded-lg bg-card p-6 shadow-[0_4px_24px_rgba(15,40,60,0.07)] lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto"
      >
        <h2 className="text-[13px] font-medium text-muted-foreground">Resumo</h2>
        <p className="mt-1 text-[28px] font-bold leading-tight tabular-nums">{props.totalLabel}</p>
        <p className="mt-1 text-sm text-muted-foreground">{props.contractors}</p>

        <div className="mt-5 space-y-4">
          {props.rows && props.rows.length > 0 && (
            <ul className="space-y-1 text-sm">
              {props.rows.map((row) => (
                <li key={row.label}>
                  <span className="text-muted-foreground">{row.label}: </span>
                  {row.value}
                </li>
              ))}
            </ul>
          )}
          <List title="Incluso" items={props.included ?? []} />
          <List title="Não incluso" items={props.notIncluded ?? []} />
          {props.termLabel !== undefined && (
            <p className="text-sm">
              {props.termLabel ? (props.termStartLabel ? `Vigência de ${props.termStartLabel} até ${props.termLabel}` : `Vigência até ${props.termLabel}`) : <span className="text-muted-foreground">Vigência não definida</span>}
            </p>
          )}
        </div>

        <div aria-live="polite" className="mt-5 border-t border-border pt-4">
          {banner && (
            <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive">{banner}</p>
          )}
          {issues.length > 0 && (
            <ul className="mb-4 space-y-1.5 text-sm">
              {issues.map((issue) => (
                <li key={issue.id}>
                  <button
                    type="button"
                    className="text-left text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => focusField(issue.fieldId)}
                  >
                    {issue.summary}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!stickyBar && <GenerateButton issues={issues} generating={generating} onGenerate={onGenerate} />}
      </aside>

    </>
  );
}

/** Small screens: the button stays at the bottom of the screen, with the first reason above it. */
export function GenerateBar({
  issues,
  generating,
  onGenerate,
}: {
  issues: FormIssue[];
  generating: boolean;
  onGenerate: () => void;
}) {
  const first = issues[0];
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-5 md:px-5">
      {first && (
        <p className="mb-2 text-[13px] text-muted-foreground">
          {first.summary}
          {issues.length > 1 ? ` e mais ${issues.length - 1}` : ""}
        </p>
      )}
      <GenerateButton issues={issues} generating={generating} onGenerate={onGenerate} />
    </div>
  );
}

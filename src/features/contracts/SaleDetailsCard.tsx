import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { t, type MessageKey } from "@/i18n";
import type { SaleClient } from "@/services/commercialApi";
import { displayPhone } from "@/features/contracts/contractFormModel";
import { readCourseItems } from "@/features/new-sale/courses/model";
import { rangeLabel } from "@/features/new-sale/courses/copy";
import { saleQueryOptions } from "@/features/new-sale/saleQuery";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import { getSaleProductName } from "@/features/sales/utils";

function clientText(client: SaleClient, key: "document" | "phone" | "email"): string {
  const extra = client as SaleClient & { document?: string | null; cpf?: string | null };
  if (key === "document") return (client.documentCiphertext || extra.document || extra.cpf || "").trim();
  if (key === "phone") return (client.telefone || client.phone || "").trim();
  return (client.email || "").trim();
}

function countLine(group: "contract.page.installments" | "contract.page.confirmLine", count: number, vars: Record<string, string | number>) {
  return t(`${group}.${count === 1 ? "one" : "other"}` as MessageKey, { ...vars, n: count });
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

/** Saved sale beside the contract. Blocks, not a table, and no inner scroll. */
export default function SaleDetailsCard({ saleId }: { saleId: string }) {
  const saleQuery = useQuery(saleQueryOptions(saleId));

  if (saleQuery.isPending) {
    return (
      <div className="space-y-3 rounded-lg bg-card p-6 shadow-[0_4px_24px_rgba(15,40,60,0.07)]" aria-busy="true">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (saleQuery.isError || !saleQuery.data) {
    return (
      <div className="rounded-lg bg-card p-6 shadow-[0_4px_24px_rgba(15,40,60,0.07)]">
        <p className="mb-3 text-sm">{t("contract.page.saleLoadError")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void saleQuery.refetch()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const sale = saleQuery.data;
  const clients = sale.clients ?? [];
  const payments = sale.payments ?? [];
  const paid = payments.filter((payment) => String(payment.status).toUpperCase() === "PAID").length;
  const amount = Number(payments[0]?.amount ?? sale.contractValue ?? 0);
  const currency = sale.currency || "";
  const courses = readCourseItems(sale.items);
  const seller = sale.seller?.name?.trim() || t("sales.card.noSeller");
  const soldOn = formatDate(sale.soldAt || sale.createdAt);

  return (
    <section aria-label={t("contract.page.salePreview")} className="space-y-5 rounded-lg bg-card p-6 shadow-[0_4px_24px_rgba(15,40,60,0.07)]">
      <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {t("contract.page.salePreview")}
      </h2>

      {clients.map((client) => (
        <Block key={client.id} title={t("sales.card.clientFallback")}>
          <p className="font-semibold">{client.nameCiphertext}</p>
          {clientText(client, "document") ? <p className="text-sm text-muted-foreground">{clientText(client, "document")}</p> : null}
          {clientText(client, "phone") ? <p className="text-sm text-muted-foreground">{displayPhone(clientText(client, "phone"))}</p> : null}
          {clientText(client, "email") ? <p className="text-sm text-muted-foreground">{clientText(client, "email")}</p> : null}
        </Block>
      ))}

      <Block title={t("contract.page.seller")}>
        <p className="font-semibold">{seller}</p>
        <p className="text-sm text-muted-foreground">{t("contract.page.soldOn", { data: soldOn })}</p>
      </Block>

      <Block title={t("contract.page.valuePayments")}>
        {currency ? <p className="text-lg font-bold tabular-nums">{formatCurrency(Number(sale.contractValue ?? amount), currency)}</p> : null}
        {payments.length > 0 && currency ? (
          <p className="text-sm text-muted-foreground">
            {countLine("contract.page.installments", payments.length, {
              valor: formatCurrency(amount, currency),
              paid: t(paid === 1 ? "contract.page.paidCount.one" : "contract.page.paidCount.other", { p: paid }),
            })}
          </p>
        ) : null}
      </Block>

      {courses.length > 0 ? (
        <Block title={t("contract.page.coursesPeriod")}>
          <ul className="space-y-2">
            {courses.map((item) => (
              <li key={`${item.kind}-${item.moduleId ?? item.courseId}`}>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.kind === "module" ? t("sale.courses.wholeModule") : t("sale.courses.kindCourse")}</p>
                {item.startsAt && item.endsAt ? <p className="text-sm text-muted-foreground">{rangeLabel(item.startsAt, item.endsAt)}</p> : null}
              </li>
            ))}
          </ul>
        </Block>
      ) : (
        <Block title={t("sale.preview.products")}>
          <p className="font-semibold">{getSaleProductName(sale)}</p>
        </Block>
      )}

      <Link to={`/vendas/${saleId}`} className="inline-flex h-11 items-center text-sm font-semibold text-primary">
        {t("contract.page.openSale")}
      </Link>
    </section>
  );
}

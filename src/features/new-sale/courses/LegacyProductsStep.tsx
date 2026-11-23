import { Lock } from "lucide-react";
import { t, type MessageKey } from "@/i18n";
import { formatAccessDate } from "./dates";
import type { SaleItem } from "@/services/commercialApi";

type Props = {
  items: SaleItem[];
  onBack: () => void;
  onNext: () => void;
};

function plural(group: string, n: number): string {
  return t(`${group}.${n === 1 ? "one" : "other"}` as MessageKey, { n });
}

/** Read-only products of a sale made before courses. Nothing here can be edited or converted. */
export function LegacyProductsStep({ items, onBack, onNext }: Props) {
  return (
    <section className="rounded-md bg-white p-6 text-[#24384F] shadow-[0_1px_2px_rgba(36,56,79,0.05),0_6px_20px_rgba(36,56,79,0.06)] max-md:rounded-none max-md:px-4 max-md:shadow-none">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">{t("sale.legacy.title")}</h2>
        <span className="whitespace-nowrap text-[13px] text-[#5D6F83]">{plural("sale.legacy.count", items.length)}</span>
      </div>
      <ul>
        {items.map((item) => {
          const name = item.product?.name?.trim() || item.name?.trim() || "";
          const when = formatAccessDate((item.releaseDate ?? "").slice(0, 10));
          return (
            <li key={item.id} className="flex min-h-[52px] items-center gap-3 border-t border-[rgba(36,56,79,0.10)] py-2 first:border-t-0">
              <Lock className="h-4 w-4 shrink-0 text-[#7C8A9A]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-semibold">{name}</p>
                {when ? <p className="text-[12.5px] text-[#5D6F83]">{t("sale.legacy.release", { data: when })}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3.5 flex gap-2.5 rounded-md bg-[#F3F6F9] p-3 text-[13px] text-[#52657A]">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#7C8A9A]" aria-hidden="true" />
        <span>{t("sale.legacy.note")}</span>
      </p>
      <div className="mt-7 flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex h-11 items-center rounded-md bg-white px-4 text-sm font-semibold text-[#2F5679] shadow-[inset_0_0_0_1px_rgba(36,56,79,0.16)]">
          Voltar
        </button>
        <button type="button" onClick={onNext} className="inline-flex h-11 items-center rounded-md bg-[#2F5679] px-4 text-sm font-semibold text-white">
          Próximo
        </button>
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listSaleContracts } from "@/services/contractsApi";
import ContractListItem from "@/features/contracts/ContractListItem";
import type { SaleOwnerRef } from "@/features/contracts/access";

type Props = { saleId: string } & SaleOwnerRef;

const VISIBLE_BY_DEFAULT = 5;

/** "Contratos" on the sale page: newest first, with the button that opens the form page. */
export default function SaleContractsPanel({ saleId, sellerId, seller }: Props) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const newContractId = (location.state as { newContractId?: string } | null)?.newContractId;
  const [showAll, setShowAll] = useState(false);
  const [highlightId, setHighlightId] = useState<string | undefined>(newContractId);

  useEffect(() => {
    if (!newContractId) return;
    setHighlightId(newContractId);
    const timer = window.setTimeout(() => setHighlightId(undefined), 2000);
    return () => window.clearTimeout(timer);
  }, [newContractId]);

  const listQuery = useQuery({
    queryKey: ["sale-contracts", saleId],
    queryFn: () => listSaleContracts(saleId),
  });

  const contracts = [...(listQuery.data ?? [])].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  );
  const visible = showAll ? contracts : contracts.slice(0, VISIBLE_BY_DEFAULT);
  const generateButton = (
    <Button asChild size="sm" className="gap-1.5">
      <Link to={`/vendas/${saleId}/contrato`}>
        <FilePlus2 className="h-4 w-4" />
        Gerar contrato
      </Link>
    </Button>
  );

  return (
    <section aria-labelledby="sale-contracts-title" className="rounded-lg bg-card p-6 shadow-[0_4px_24px_rgba(15,40,60,0.07)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 id="sale-contracts-title" className="text-lg font-semibold">
          Contratos
        </h2>
        {contracts.length > 0 && generateButton}
      </div>

      {listQuery.isLoading ? (
        <div className="space-y-3 py-2" aria-busy="true" aria-label="Carregando contratos">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[72px] w-full" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">Não foi possível carregar os contratos.</p>
          <Button size="sm" variant="outline" onClick={() => void listQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : contracts.length === 0 ? (
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">Nenhum contrato gerado ainda.</p>
          {generateButton}
        </div>
      ) : (
        <>
          <ul>
            {visible.map((contract) => (
              <ContractListItem
                key={contract.id}
                contract={contract}
                saleId={saleId}
                sale={{ sellerId, seller }}
                highlight={contract.id === highlightId}
                onChanged={() => void queryClient.invalidateQueries({ queryKey: ["sale-contracts", saleId] })}
              />
            ))}
          </ul>
          {!showAll && contracts.length > VISIBLE_BY_DEFAULT && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll(true)}>
              Ver todos ({contracts.length})
            </Button>
          )}
        </>
      )}
    </section>
  );
}

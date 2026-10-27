import { Ban, CircleCheck, CircleX, FileText, Send, type LucideIcon } from "lucide-react";
import type { ContractStatus } from "@/services/contractsApi";

export interface StatusPresentation {
  label: string;
  Icon: LucideIcon;
  /** Colour only on the icon. */
  iconClass: string;
}

export const CONTRACT_STATUS: Record<ContractStatus, StatusPresentation> = {
  GENERATED: { label: "Gerado", Icon: FileText, iconClass: "text-muted-foreground" },
  SENT: { label: "Enviado", Icon: Send, iconClass: "text-blue-600" },
  SIGNED: { label: "Assinado", Icon: CircleCheck, iconClass: "text-emerald-600" },
  DECLINED: { label: "Recusado", Icon: CircleX, iconClass: "text-destructive" },
  VOIDED: { label: "Cancelado", Icon: Ban, iconClass: "text-muted-foreground" },
};

/** Day the contract was generated, in the user's time zone. */
export function formatGeneratedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function contractorsLabel(
  signers: Array<{ name?: string | null; nameCiphertext?: string }> | undefined,
): string {
  const names = (signers ?? [])
    .map((signer) => (signer.name ?? signer.nameCiphertext ?? "").trim())
    .filter(Boolean);
  if (names.length === 0) return "";
  return names.length === 1 ? names[0] : `${names[0]} e mais ${names.length - 1}`;
}

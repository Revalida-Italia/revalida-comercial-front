/** Extrai o sufixo do link Asaas para uso no botao do template WhatsApp. */
export function getAsaasLinkSuffix(linkPagamento: string): string {
  const trimmed = linkPagamento.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? trimmed;
  } catch {
    const parts = trimmed.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? trimmed;
  }
}

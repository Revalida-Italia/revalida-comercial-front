import { getProfile, hasAnyRole, hasRole } from "@/lib/session";

/**
 * Who can generate contracts, see the contract list and download them: administrators and sellers.
 * The API limits a seller to the sales that are theirs, so the screens only open for sales the
 * seller can already see. Change who is allowed here only.
 */
export function canGenerateContracts(): boolean {
  return hasAnyRole("ADMIN", "SELLER");
}

/** Sale fields used to tell whether the logged-in seller owns it. */
export interface SaleOwnerRef {
  sellerId?: string | null;
  seller?: { id?: string | null; externalId?: string | null } | null;
}

function idOf(value?: string | null): string {
  return String(value ?? "").trim();
}

/** True when the logged-in user is the seller recorded on the sale. */
export function isSaleOwner(sale: SaleOwnerRef | null | undefined): boolean {
  const profile = getProfile();
  if (!profile || !sale) return false;
  const mine = [profile.sub, profile.id, profile.externalId].map(idOf).filter(Boolean);
  const theirs = [sale.sellerId, sale.seller?.id, sale.seller?.externalId].map(idOf).filter(Boolean);
  return mine.some((id) => theirs.includes(id));
}

/**
 * Sending for signature: administrators, and the seller who owns the sale.
 * Refreshing the status stays with administrators (`canManageSignature`).
 */
export function canSendForSignature(sale?: SaleOwnerRef | null): boolean {
  if (hasRole("ADMIN")) return true;
  return hasRole("SELLER") && isSaleOwner(sale);
}

/** Refreshing signature status stays with administrators. */
export function canManageSignature(): boolean {
  return hasRole("ADMIN");
}

/** Creating student access stays with administrators. */
export function canCreateStudentAccess(): boolean {
  return hasRole("ADMIN");
}

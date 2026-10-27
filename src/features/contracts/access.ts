import { hasAnyRole, hasRole } from "@/lib/session";

/**
 * Who can generate contracts, see the contract list and download them: administrators and sellers.
 * The API limits a seller to the sales that are theirs, so the screens only open for sales the
 * seller can already see. Change who is allowed here only.
 */
export function canGenerateContracts(): boolean {
  return hasAnyRole("ADMIN", "SELLER");
}

/** Sending for signature and refreshing its status stay with administrators. */
export function canManageSignature(): boolean {
  return hasRole("ADMIN");
}

/** Creating student access stays with administrators. */
export function canCreateStudentAccess(): boolean {
  return hasRole("ADMIN");
}

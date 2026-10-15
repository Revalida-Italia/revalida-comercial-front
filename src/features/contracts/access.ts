import { hasRole } from "@/lib/session";

/**
 * Who can generate contracts and see the contract list. The API only accepts administrators today,
 * so the screens follow it. When the API opens contracts to sellers, change it here only.
 */
export function canGenerateContracts(): boolean {
  return hasRole("ADMIN");
}

/** Creating student access stays with administrators. */
export function canCreateStudentAccess(): boolean {
  return hasRole("ADMIN");
}

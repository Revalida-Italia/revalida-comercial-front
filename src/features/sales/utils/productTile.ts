/** Long catalog names use two initials; everything else keeps the cap tile. */
export function productTileInitials(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 41) return null;
  const words = trimmed
    .split(/[\s—–-]+/u)
    .map((word) => word.replace(/[^0-9A-Za-zÀ-ÿ]/gu, ""))
    .filter((word) => /[A-Za-zÀ-ÿ]/u.test(word));
  if (words.length < 2) return null;
  const first = words[0].match(/[A-Za-zÀ-ÿ]/u)?.[0] ?? "";
  const second = words[1].match(/[A-Za-zÀ-ÿ]/u)?.[0] ?? "";
  const initials = `${first}${second}`.toLocaleUpperCase("pt-BR");
  return initials.length === 2 ? initials : null;
}

/** Indices das variaveis {{1}}, {{2}}, ... no corpo, em ordem crescente. */
export function extractTemplateVariableIndices(corpo: string): number[] {
  const indices = new Set<number>();
  const matches = corpo.matchAll(/\{\{(\d+)\}\}/g);

  for (const match of matches) {
    const index = Number(match[1]);
    if (Number.isInteger(index) && index > 0) {
      indices.add(index);
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

export function syncVariableExamples(
  corpo: string,
  current: Record<number, string>,
): Record<number, string> {
  const indices = extractTemplateVariableIndices(corpo);
  const next: Record<number, string> = {};

  for (const index of indices) {
    next[index] = current[index] ?? "";
  }

  return next;
}

export function buildTemplatePreview(corpo: string, examples: Record<number, string>): string {
  return corpo.replace(/\{\{(\d+)\}\}/g, (_, rawIndex) => {
    const index = Number(rawIndex);
    const value = examples[index]?.trim();
    return value || `{{${index}}}`;
  });
}

export function buildExemplosArray(
  indices: number[],
  examples: Record<number, string>,
): string[] {
  return indices.map((index) => examples[index]?.trim() ?? "");
}

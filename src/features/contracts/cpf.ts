const CPF_LENGTH = 11;

/**
 * CPF shown in the Escola de Italiano form: 000.000.000-00.
 * Extra digits are dropped. Deleting a punctuation mark removes a digit.
 */
export function formatCpf(raw: string, previous = ""): string {
  let digits = raw.replace(/\D/g, "");
  const previousDigits = previous.replace(/\D/g, "");
  if (raw.length < previous.length && digits === previousDigits && digits.length > 0) {
    digits = digits.slice(0, -1);
  }
  digits = digits.slice(0, CPF_LENGTH);

  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6, 9);
  const d = digits.slice(9, 11);
  if (digits.length <= 3) return a;
  if (digits.length <= 6) return `${a}.${b}`;
  if (digits.length <= 9) return `${a}.${b}.${c}`;
  return `${a}.${b}.${c}-${d}`;
}

function checkDigit(digits: string, length: number): number {
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    sum += Number(digits[i]) * (length + 1 - i);
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** True when the value has 11 digits, the two check digits, and is not a repeated sequence. */
export function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (!/^\d{11}$/.test(digits)) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  return checkDigit(digits, 9) === Number(digits[9]) && checkDigit(digits, 10) === Number(digits[10]);
}

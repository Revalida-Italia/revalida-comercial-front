/**
 * Minimal i18n: every user-visible string of a translated screen comes from a locale file.
 * Keys are English dot paths; values may have {placeholders}.
 * pt-BR is the app default. it, es and en cover the course-release screens.
 */
import { en } from "./locales/en";
import { es } from "./locales/es";
import { it } from "./locales/it";
import { ptBR } from "./locales/pt-BR";

export type Messages = typeof ptBR;

type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type MessageVars = Record<string, string | number>;

const LOCALES: Record<string, Messages> = {
  "pt-BR": ptBR,
  pt: ptBR,
  it: it as Messages,
  es: es as Messages,
  en: en as Messages,
};
let localeName = "pt-BR";
let current: Messages = ptBR;

export function setLocale(locale: string): void {
  localeName = LOCALES[locale] ? locale : "pt-BR";
  current = LOCALES[localeName];
}

export function getLocale(): string {
  return localeName;
}

/** pt, it and es use day/month/year. English uses month/day/year. */
export function dateOrder(): "dmy" | "mdy" {
  return localeName === "en" || localeName.startsWith("en-") ? "mdy" : "dmy";
}

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function t(key: MessageKey, vars?: MessageVars): string {
  const template = lookup(current, key) ?? lookup(ptBR, key) ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

/** "1 contratante" / "2 contratantes": picks `.one` or `.other` of a key group. */
type CountGroup<K = MessageKey> = K extends `${infer G}.one` ? G : never;

export function tCount(group: CountGroup, count: number): string {
  return t(`${group}.${count === 1 ? "one" : "other"}` as MessageKey, { count });
}

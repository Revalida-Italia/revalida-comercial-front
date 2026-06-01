import { apiRequest } from "@/lib/http";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL as string;

export interface WhatsappTemplate {
  id?: string;
  nome: string;
  categoria: string;
  idioma: string;
  corpo: string;
  exemplos?: string[];
  status?: string;
}

export interface CreateWhatsappTemplateInput {
  nome: string;
  categoria: string;
  idioma: string;
  corpo: string;
  exemplos: string[];
}

export interface SendWhatsappTemplateInput {
  telefone: string;
  templateName: string;
  languageCode: string;
  bodyParams: string[];
  buttonUrlParams?: Array<{ index: number; url: string }>;
}

export interface SendPaymentLinkInput {
  paymentId: string;
  telefone: string;
  templateName: string;
  bodyParams: string[];
}

interface ListWrapper<T> {
  data?: T[];
}

function unwrapArray<T>(payload: T[] | ListWrapper<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.data ?? [];
}

export async function listWhatsappTemplates(): Promise<WhatsappTemplate[]> {
  const payload = await apiRequest<WhatsappTemplate[] | ListWrapper<WhatsappTemplate>>(
    CORE_API_URL,
    "/api/templates",
  );
  return unwrapArray(payload);
}

export async function createWhatsappTemplate(input: CreateWhatsappTemplateInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, "/api/templates", {
    method: "POST",
    body: input,
  });
}

export async function sendWhatsappTemplate(input: SendWhatsappTemplateInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, "/api/whatsapp/template", {
    method: "POST",
    body: input,
  });
}

export async function sendPaymentLinkWhatsapp(input: SendPaymentLinkInput): Promise<void> {
  await apiRequest<void>(CORE_API_URL, "/api/whatsapp/enviar-link-pagamento", {
    method: "POST",
    body: input,
  });
}

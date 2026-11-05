/**
 * V2 sales-card copy marked [A] in the card DELTA.
 * pt-BR is what the app shows today. it / es / en are the same keys for when those locales ship.
 */
export const salesCardV2Copy = {
  "pt-BR": {
    clientsExtra: "+{count}",
    paidShort: "{paid} de {total}",
    paymentLinkShort: "Link",
    otherLinks: "Outros links",
    whatsapp: "Abrir WhatsApp do cliente",
    unarchive: "Desarquivar",
  },
  it: {
    clientsExtra: "+{count}",
    paidShort: "{paid} di {total}",
    paymentLinkShort: "Link",
    otherLinks: "Altri link",
    whatsapp: "Apri WhatsApp del cliente",
    unarchive: "Ripristina",
  },
  es: {
    clientsExtra: "+{count}",
    paidShort: "{paid} de {total}",
    paymentLinkShort: "Enlace",
    otherLinks: "Otros enlaces",
    whatsapp: "Abrir WhatsApp del cliente",
    unarchive: "Desarchivar",
  },
  en: {
    clientsExtra: "+{count}",
    paidShort: "{paid} of {total}",
    paymentLinkShort: "Link",
    otherLinks: "Other links",
    whatsapp: "Open client's WhatsApp",
    unarchive: "Unarchive",
  },
} as const;

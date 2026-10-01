import "server-only";

const API_KEY = process.env.INTERAKT_API_KEY ?? "";
import { normalizeLocale, type Locale } from "./i18n";

// What fills each template blank. A template's body blanks are listed in
// order (INTERAKT_TEMPLATE_BODY_MR=name,product,link,books); its URL button
// blank (INTERAKT_TEMPLATE_BUTTON_MR) takes one of these keys or a literal.
type DeliveryValues = {
  name: string;
  product: string;
  link: string;
  books: string;
};

function parseBody(raw: string | undefined): (keyof DeliveryValues)[] {
  const keys = (raw || "name,product,link")
    .split(",")
    .map((key) => key.trim())
    .filter((key): key is keyof DeliveryValues =>
      ["name", "product", "link", "books"].includes(key),
    );
  return keys.length ? keys : ["name", "product", "link"];
}

type Template = {
  name: string;
  languageCode: string;
  body: (keyof DeliveryValues)[];
  button: string;
  /** "document" when the approved template has a PDF (Document) header. */
  header: "" | "document";
};

const TEMPLATES: Record<Locale, Template> = {
  mr: {
    name: process.env.INTERAKT_TEMPLATE_NAME_MR ?? process.env.INTERAKT_TEMPLATE_NAME ?? "",
    languageCode: process.env.INTERAKT_TEMPLATE_LANGUAGE_MR ?? process.env.INTERAKT_TEMPLATE_LANGUAGE ?? "mr",
    body: parseBody(process.env.INTERAKT_TEMPLATE_BODY_MR),
    button: process.env.INTERAKT_TEMPLATE_BUTTON_MR ?? "",
    header: process.env.INTERAKT_TEMPLATE_HEADER_MR === "document" ? "document" : "",
  },
  hi: {
    name: process.env.INTERAKT_TEMPLATE_NAME_HI ?? "",
    languageCode: process.env.INTERAKT_TEMPLATE_LANGUAGE_HI ?? "hi",
    body: parseBody(process.env.INTERAKT_TEMPLATE_BODY_HI),
    button: process.env.INTERAKT_TEMPLATE_BUTTON_HI ?? "",
    header: process.env.INTERAKT_TEMPLATE_HEADER_HI === "document" ? "document" : "",
  },
  en: {
    name: process.env.INTERAKT_TEMPLATE_NAME_EN ?? "",
    languageCode: process.env.INTERAKT_TEMPLATE_LANGUAGE_EN ?? "en",
    body: parseBody(process.env.INTERAKT_TEMPLATE_BODY_EN),
    button: process.env.INTERAKT_TEMPLATE_BUTTON_EN ?? "",
    header: process.env.INTERAKT_TEMPLATE_HEADER_EN === "document" ? "document" : "",
  },
};

/** True when the buyer's language template attaches the PDF itself. */
export function templateAttachesPdf(locale: Locale): boolean {
  return TEMPLATES[normalizeLocale(locale)].header === "document";
}

export const isInteraktConfigured = Boolean(
  API_KEY && Object.values(TEMPLATES).some((template) => template.name),
);

/**
 * Sends the approved WhatsApp delivery template via Interakt.
 * By default the body blanks are {{1}}=name, {{2}}=product, {{3}}=download
 * link; INTERAKT_TEMPLATE_BODY_<LOCALE> changes the order/count, and
 * INTERAKT_TEMPLATE_BUTTON_<LOCALE> fills a URL button's blank.
 */
export async function sendWhatsAppDelivery(opts: {
  phone: string;
  name: string;
  productTitle: string;
  downloadLink: string;
  booksLink: string;
  /** Required when the template has a Document header. */
  document?: { url: string; fileName: string } | null;
  locale: Locale;
}): Promise<boolean> {
  const locale = normalizeLocale(opts.locale);
  const template = TEMPLATES[locale];
  if (!API_KEY || !template.name) return false;
  if (template.header === "document" && !opts.document) return false;
  const values: DeliveryValues = {
    name: opts.name,
    product: opts.productTitle,
    link: opts.downloadLink,
    books: opts.booksLink,
  };
  const buttonValue = template.button
    ? (values[template.button as keyof DeliveryValues] ?? template.button)
    : "";
  return sendTemplate(opts.phone, {
    name: template.name,
    languageCode: template.languageCode,
    ...(template.header === "document" && opts.document
      ? { headerValues: [opts.document.url], fileName: opts.document.fileName }
      : {}),
    bodyValues: template.body.map((key) => values[key]),
    ...(buttonValue ? { buttonValues: { "0": [buttonValue] } } : {}),
  });
}

// "Payment not completed" reminder. The approved template's body blanks are
// {{1}}=name, {{2}}=product, {{3}}=link back to the book page. One template
// name; each book language picks which approved language version to send
// (falls back to the Marathi version until a Hindi/English one is approved).
const REMINDER_NAME = process.env.INTERAKT_REMINDER_TEMPLATE_NAME ?? "";
const REMINDER_DEFAULT_LANGUAGE = process.env.INTERAKT_REMINDER_TEMPLATE_LANGUAGE ?? "mr";
const REMINDER_LANGUAGES: Record<Locale, string> = {
  mr: REMINDER_DEFAULT_LANGUAGE,
  hi: process.env.INTERAKT_REMINDER_TEMPLATE_LANGUAGE_HI || REMINDER_DEFAULT_LANGUAGE,
  en: process.env.INTERAKT_REMINDER_TEMPLATE_LANGUAGE_EN || REMINDER_DEFAULT_LANGUAGE,
};

export const isReminderConfigured = Boolean(API_KEY && REMINDER_NAME);

export async function sendPaymentReminder(opts: {
  phone: string;
  name: string;
  productTitle: string;
  productLink: string;
  locale: Locale;
}): Promise<boolean> {
  if (!isReminderConfigured) return false;
  return sendTemplate(opts.phone, {
    name: REMINDER_NAME,
    languageCode: REMINDER_LANGUAGES[normalizeLocale(opts.locale)],
    bodyValues: [opts.name, opts.productTitle, opts.productLink],
  });
}

async function sendTemplate(rawPhone: string, template: Record<string, unknown>): Promise<boolean> {
  const phone = rawPhone.replace(/\D/g, "").slice(-10);
  try {
    const res = await fetch("https://api.interakt.ai/v1/public/message/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${API_KEY}`,
      },
      body: JSON.stringify({
        countryCode: "+91",
        phoneNumber: phone,
        type: "Template",
        template,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[interakt] send failed", template.name, res.status, (await res.text()).slice(0, 300));
    }
    return res.ok;
  } catch (error) {
    console.error("[interakt] send failed", template.name, String(error));
    return false;
  }
}

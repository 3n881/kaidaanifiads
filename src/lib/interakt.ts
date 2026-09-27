import "server-only";

const API_KEY = process.env.INTERAKT_API_KEY ?? "";
import { normalizeLocale, type Locale } from "./i18n";

const TEMPLATES: Record<Locale, { name: string; languageCode: string }> = {
  mr: {
    name: process.env.INTERAKT_TEMPLATE_NAME_MR ?? process.env.INTERAKT_TEMPLATE_NAME ?? "",
    languageCode: process.env.INTERAKT_TEMPLATE_LANGUAGE_MR ?? process.env.INTERAKT_TEMPLATE_LANGUAGE ?? "mr",
  },
  hi: {
    name: process.env.INTERAKT_TEMPLATE_NAME_HI ?? "",
    languageCode: process.env.INTERAKT_TEMPLATE_LANGUAGE_HI ?? "hi",
  },
  en: {
    name: process.env.INTERAKT_TEMPLATE_NAME_EN ?? "",
    languageCode: process.env.INTERAKT_TEMPLATE_LANGUAGE_EN ?? "en",
  },
};

export const isInteraktConfigured = Boolean(
  API_KEY && Object.values(TEMPLATES).some((template) => template.name),
);

/**
 * Sends the approved WhatsApp delivery template via Interakt.
 * Template body placeholders must be, in order: {{1}}=name, {{2}}=product,
 * {{3}}=download link. Configure one approved template name per locale.
 */
export async function sendWhatsAppDelivery(opts: {
  phone: string;
  name: string;
  productTitle: string;
  downloadLink: string;
  locale: Locale;
}): Promise<boolean> {
  const locale = normalizeLocale(opts.locale);
  const template = TEMPLATES[locale];
  if (!API_KEY || !template.name) return false;
  const phone = opts.phone.replace(/\D/g, "").slice(-10);
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
        template: {
          name: template.name,
          languageCode: template.languageCode,
          bodyValues: [opts.name, opts.productTitle, opts.downloadLink],
        },
      }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

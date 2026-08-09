import "server-only";

const API_KEY = process.env.INTERAKT_API_KEY ?? "";
const TEMPLATE = process.env.INTERAKT_TEMPLATE_NAME ?? "";
const LANG = process.env.INTERAKT_TEMPLATE_LANGUAGE ?? "mr";

export const isInteraktConfigured = Boolean(API_KEY && TEMPLATE);

/**
 * Sends the approved WhatsApp delivery template via Interakt.
 * Template body placeholders must be, in order: {{1}}=name, {{2}}=product,
 * {{3}}=download link. Configure INTERAKT_TEMPLATE_NAME to your approved name.
 */
export async function sendWhatsAppDelivery(opts: {
  phone: string;
  name: string;
  productTitle: string;
  downloadLink: string;
}): Promise<boolean> {
  if (!isInteraktConfigured) return false;
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
          name: TEMPLATE,
          languageCode: LANG,
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

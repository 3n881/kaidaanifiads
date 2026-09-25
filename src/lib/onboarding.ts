import type { AdminProduct, StoreSettings } from "./admin";

export interface ProgressItem {
  key: string;
  label: string;
  href: string;
  complete: boolean;
  missing: string[];
}

const present = (value: unknown) =>
  value === true || (typeof value === "string" && value.trim().length > 0);

function missingFields(
  values: Record<string, string | boolean>,
  fields: Array<[string, string]>,
) {
  return fields.filter(([key]) => !present(values[key])).map(([, label]) => label);
}

export function productIsReady(product: AdminProduct) {
  return Boolean(
    product.title &&
      product.short_description &&
      product.description &&
      product.price > 0 &&
      product.mrp >= product.price &&
      product.cover_image &&
      (product.is_combo
        ? Boolean(product.set_size && product.set_size >= 2)
        : Boolean(product.pdf_path && product.pages)),
  );
}

export function getOnboardingProgress(
  settings: StoreSettings,
  products: AdminProduct[],
) {
  const businessMissing = missingFields(settings.business, [
    ["brand_name", "brand name"],
    ["legal_name", "legal company name"],
    ["logo_url", "logo"],
    ["support_email", "support email"],
    ["support_whatsapp", "support WhatsApp"],
    ["business_address", "business address"],
    ["approver_name", "authorized approver"],
    ["domain_name", "domain name"],
    ["privacy_email", "privacy contact"],
    ["disclaimer_approved", "legal disclaimer approval"],
  ]);
  const contentMissing = missingFields(settings.content, [
    ["hero_title", "homepage headline"],
    ["hero_text", "homepage supporting text"],
    ["about_text", "company story and mission"],
    ["director_profile", "director or proprietor profile"],
  ]);
  const integrationMissing = [
    ["supabase", "Supabase"],
    ["razorpay", "Razorpay"],
    ["interakt", "Interakt"],
    ["meta_business", "Meta Business verification"],
    ["whatsapp_template", "WhatsApp template approval"],
    ["domain", "domain and hosting"],
  ].filter(([key]) => settings.integrations[key] !== "ready").map(([, label]) => label);
  const readyProducts = products.filter(productIsReady).length;
  const productMissing = products.length === 0
    ? ["at least one ebook"]
    : readyProducts === products.length
      ? []
      : [`${products.length - readyProducts} incomplete product${products.length - readyProducts === 1 ? "" : "s"}`];
  const approvalMissing = missingFields(settings.launch, [
    ["legal_approved", "legal pages approval"],
    ["staging_approved", "staging approval"],
    ["payment_tested", "real payment and delivery test"],
  ]);

  const items: ProgressItem[] = [
    { key: "business", label: "Business and brand", href: "/dashboard/setup", complete: businessMissing.length === 0, missing: businessMissing },
    { key: "products", label: "Books and files", href: "/dashboard/products", complete: productMissing.length === 0, missing: productMissing },
    { key: "content", label: "Website content", href: "/dashboard/content", complete: contentMissing.length === 0, missing: contentMissing },
    { key: "integrations", label: "Payments and delivery", href: "/dashboard/integrations", complete: integrationMissing.length === 0, missing: integrationMissing },
    { key: "launch", label: "Review and approval", href: "/dashboard/launch", complete: approvalMissing.length === 0, missing: approvalMissing },
  ];
  const completed = items.filter((item) => item.complete).length;
  return {
    items,
    completed,
    total: items.length,
    percent: Math.round((completed / items.length) * 100),
    readyProducts,
    next: items.find((item) => !item.complete) ?? null,
  };
}

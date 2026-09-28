import type { AdminProduct, StoreSettings } from "./admin";

export interface ProgressItem {
  key: string;
  label: string;
  href: string;
  complete: boolean;
  missing: string[];
  completedCount: number;
  totalCount: number;
}

const present = (value: unknown) =>
  value === true || (typeof value === "string" && value.trim().length > 0);

function missingFields(
  values: Record<string, string | boolean>,
  fields: Array<[string, string]>,
) {
  return fields.filter(([key]) => !present(values[key])).map(([, label]) => label);
}

/** Editions this product is offered in: those with a PDF to deliver (for a
 *  combo without its own PDF, the editions its member books cover). */
export function offeredEditions(product: AdminProduct): Array<"mr" | "hi" | "en"> {
  const withPdf = (["mr", "hi", "en"] as const).filter((locale) =>
    locale === "mr" ? product.pdf_path_mr || product.pdf_path : product[`pdf_path_${locale}`],
  );
  if (withPdf.length || !product.is_combo) return withPdf;
  return product.available_locales ?? [];
}

/** Ready = offered in at least one language, and every offered language has
 *  its full listing (title, descriptions, cover, pages). A Marathi-only book
 *  does not need Hindi or English editions. */
export function productIsReady(product: AdminProduct) {
  const editions = offeredEditions(product);
  const localizedDetailsReady = editions.length > 0 && editions.every((locale) => {
    const title = locale === "mr" ? product.title_mr || product.title : product[`title_${locale}`];
    const shortDescription = locale === "mr"
      ? product.short_description_mr || product.short_description
      : product[`short_description_${locale}`];
    const description = locale === "mr"
      ? product.description_mr || product.description
      : product[`description_${locale}`];
    const cover = locale === "mr"
      ? product.cover_image_mr || product.cover_image
      : product[`cover_image_${locale}`];
    const pages = locale === "mr"
      ? product.pages_mr || product.pages
      : product[`pages_${locale}`];
    return Boolean(
      title && shortDescription && description && cover && (product.is_combo || pages),
    );
  });
  return Boolean(
    localizedDetailsReady &&
      product.price > 0 &&
      product.mrp >= product.price &&
      (!product.is_combo || (product.set_size && product.set_size >= 2)),
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
    { key: "business", label: "Business and brand", href: "/dashboard/setup", complete: businessMissing.length === 0, missing: businessMissing, completedCount: 10 - businessMissing.length, totalCount: 10 },
    { key: "products", label: "Books and files", href: "/dashboard/products", complete: productMissing.length === 0, missing: productMissing, completedCount: productMissing.length === 0 ? 1 : 0, totalCount: 1 },
    { key: "content", label: "Website content", href: "/dashboard/content", complete: contentMissing.length === 0, missing: contentMissing, completedCount: 4 - contentMissing.length, totalCount: 4 },
    { key: "integrations", label: "Payments and delivery", href: "/dashboard/integrations", complete: integrationMissing.length === 0, missing: integrationMissing, completedCount: 6 - integrationMissing.length, totalCount: 6 },
    { key: "launch", label: "Review and approval", href: "/dashboard/launch", complete: approvalMissing.length === 0, missing: approvalMissing, completedCount: 3 - approvalMissing.length, totalCount: 3 },
  ];
  const completed = items.filter((item) => item.complete).length;
  const completedRequirements = items.reduce((sum, item) => sum + item.completedCount, 0);
  const totalRequirements = items.reduce((sum, item) => sum + item.totalCount, 0);
  return {
    items,
    completed,
    total: items.length,
    completedRequirements,
    totalRequirements,
    percent: Math.round((completedRequirements / totalRequirements) * 100),
    readyProducts,
    next: items.find((item) => !item.complete) ?? null,
  };
}

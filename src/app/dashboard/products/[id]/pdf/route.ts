import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizeLocale } from "@/lib/i18n";

export const runtime = "nodejs";

const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex",
};

/**
 * GET /dashboard/products/{id}/pdf?lang=mr — admin-only: opens the PDF
 * attached to that language edition (5-minute signed URL, shown inline) so
 * the team can check the right file is uploaded.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await getAdminUser())) {
    return new NextResponse("Unauthorized", { status: 401, headers: NO_STORE });
  }
  const { id } = await ctx.params;
  const locale = normalizeLocale(req.nextUrl.searchParams.get("lang"));
  const admin = getSupabaseAdmin();
  const { data: product, error } = await admin
    .from("products")
    .select("pdf_path, pdf_path_mr, pdf_path_hi, pdf_path_en")
    .eq("id", Number(id))
    .maybeSingle();
  if (error) {
    return new NextResponse("Database unavailable — try again.", { status: 503, headers: NO_STORE });
  }
  const path = locale === "mr"
    ? product?.pdf_path_mr || product?.pdf_path
    : product?.[`pdf_path_${locale}`];
  if (!path) {
    return new NextResponse("No PDF uploaded for this language.", { status: 404, headers: NO_STORE });
  }
  const { data: signed, error: signError } = await admin.storage
    .from("pdfs")
    .createSignedUrl(path, 60 * 5);
  if (signError || !signed) {
    return new NextResponse("Could not open the PDF — try again.", { status: 503, headers: NO_STORE });
  }
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: NO_STORE });
}

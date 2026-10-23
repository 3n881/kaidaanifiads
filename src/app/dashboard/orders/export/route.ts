import type { NextRequest } from "next/server";
import { getAdminProducts } from "@/lib/admin";
import { failureLabel } from "@/lib/payment-failure";
import { dropOffKind, EXPORT_LIMIT, getOrdersView, parseOrderFilters, shortOrderId } from "@/lib/sales";

export const dynamic = "force-dynamic";

const ist = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Admin-only: the Orders page's current filters as a CSV (opens in Excel / Google Sheets). */
export async function GET(req: NextRequest) {
  const filters = parseOrderFilters(Object.fromEntries(req.nextUrl.searchParams));
  // getOrdersView checks the admin login.
  const [view, products] = await Promise.all([getOrdersView(filters, EXPORT_LIMIT), getAdminProducts()]);
  const titles = new Map(products.map((p) => [p.id, p.title_mr || p.title || p.title_hi || p.title_en || ""]));

  const header = ["Order no", "Name", "Created (IST)", "Paid (IST)", "Status", "Book ID", "Book", "Language", "Amount ₹", "Refunded ₹", "Phone", "Razorpay payment", "Failure reason", "Payment method", "Downloads", "WhatsApp sends", "Order ID"];
  const lines = view.rows.map((o) =>
    [
      `#${shortOrderId(o.id)}`,
      o.name && o.name !== "Guest" ? o.name : "",
      ist(o.created_at),
      ist(o.paid_at),
      o.refund_status ? `refunded (${o.refund_status})` : (dropOffKind(o) ?? "paid"),
      o.product_id ?? "",
      o.product_id === null ? "" : titles.get(o.product_id) ?? "",
      o.locale ?? "",
      o.amount,
      o.refunded_amount ?? 0,
      o.buyer_contact || o.whatsapp_number || "",
      o.razorpay_payment_id ?? "",
      o.status === "failed" ? failureLabel(o) ?? "" : "",
      o.status === "failed" ? o.failure_method ?? "" : "",
      o.download_count ?? 0,
      o.whatsapp_sends ?? 0,
      o.id,
    ]
      .map(cell)
      .join(","),
  );
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  // BOM so Excel shows Marathi/Hindi titles correctly.
  return new Response(`﻿${[header.map(cell).join(","), ...lines].join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${filters.period}-${day}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

import type { NextRequest } from "next/server";
import { getPrintOrdersView, PRINT_TABS } from "@/lib/print-orders";

export const dynamic = "force-dynamic";

const ist = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "";
const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Admin-only: printed orders of the current tab as a CSV address list for the courier. */
export async function GET(req: NextRequest) {
  const tab = PRINT_TABS.find((t) => t === req.nextUrl.searchParams.get("tab")) ?? "todo";
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  // getPrintOrdersView checks the admin login.
  const view = await getPrintOrdersView({ tab, q });
  const rows = view.ready ? view.rows : [];
  const header = ["Order no", "Ordered (IST)", "Status", "Payment", "Collect on delivery ₹", "Amount ₹", "Book", "Name", "Mobile", "House / building", "Area / village", "Landmark", "City / taluka", "District", "State", "PIN code", "Courier", "Tracking", "Shipped (IST)"];
  const lines = rows.map((o) =>
    [
      o.order_no,
      ist(o.created_at),
      o.status,
      o.payment_mode === "cod" ? "COD" : "Online (paid)",
      o.payment_mode === "cod" ? o.amount : 0,
      o.amount,
      o.product_title,
      o.name,
      o.phone,
      o.house,
      o.area,
      o.landmark ?? "",
      o.city,
      o.district,
      o.state,
      o.pincode,
      o.courier ?? "",
      o.tracking_no ?? "",
      ist(o.shipped_at),
    ]
      .map(cell)
      .join(","),
  );
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return new Response(`﻿${[header.map(cell).join(","), ...lines].join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="printed-orders-${tab}-${day}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import ResendButton from "@/components/admin/ResendButton";
import { getAdminOrders } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Admin — Orders",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getAdminOrders();

  return (
    <AdminShell active="orders" title="Orders">
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-12 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-brand-300" />
          <p className="font-deva mt-3 text-sm font-semibold text-brand-700">
            अजून कोणतीही ऑर्डर नाही
          </p>
          <p className="font-deva mt-1 text-xs text-brand-400">
            Razorpay पेमेंट लाइव्ह झाल्यावर इथे ऑर्डर्स दिसतील.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-brand-50/60 text-xs uppercase text-brand-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">WhatsApp</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">WhatsApp sent</th>
                  <th className="px-4 py-3 font-semibold">Downloads</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3 text-brand-500">
                      {new Date(o.created_at).toLocaleString("en-IN")}
                    </td>
                    <td className="font-deva px-4 py-3 font-medium text-brand-900">
                      {o.name}
                    </td>
                    <td className="px-4 py-3 text-brand-600">
                      {o.whatsapp_number || (o.buyer_contact ? `${o.buyer_contact} (Razorpay)` : "—")}
                    </td>
                    <td className="px-4 py-3 font-semibold text-brand-800">
                      ₹{o.amount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          o.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : o.status === "failed"
                              ? "bg-danger-500/10 text-danger-600"
                              : "bg-brand-100 text-brand-600"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {o.delivered ? "✅" : "—"}
                    </td>
                    <td className="px-4 py-3 text-brand-600">
                      {o.download_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {o.status === "paid" && <ResendButton orderId={o.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

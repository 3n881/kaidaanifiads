import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Pencil, BookOpen, Package, Eye, EyeOff } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import { getAdminProducts } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Admin — Products",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const products = await getAdminProducts();
  const ebooks = products.filter((p) => !p.is_combo);
  const combos = products.filter((p) => p.is_combo);

  return (
    <AdminShell
      active="products"
      title="Products"
      action={
        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center gap-2 self-start rounded-xl bg-brand-teal px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-teal/90"
        >
          <Plus className="h-4 w-4" /> नवीन पुस्तक
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon={BookOpen} label="ई-बुक्स" value={ebooks.length} />
        <Stat icon={Package} label="कॉम्बो" value={combos.length} />
        <Stat
          icon={Eye}
          label="Active"
          value={products.filter((p) => p.active).length}
        />
        <Stat
          icon={EyeOff}
          label="Hidden"
          value={products.filter((p) => !p.active).length}
        />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-brand-50/60 text-xs uppercase text-brand-500">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Lang</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3 text-brand-400">{p.id}</td>
                  <td className="font-deva max-w-[260px] truncate px-4 py-3 font-medium text-brand-900">
                    {p.title}
                    {p.featured && (
                      <span className="ml-2 rounded bg-brand-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-teal">
                        ★
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.is_combo
                          ? "bg-brand-teal/10 text-brand-teal"
                          : "bg-brand-100 text-brand-700"
                      }`}
                    >
                      {p.is_combo ? "Combo" : "Ebook"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-600">{p.language}</td>
                  <td className="px-4 py-3 text-brand-700">
                    <span className="text-brand-300 line-through">
                      ₹{p.mrp}
                    </span>{" "}
                    <b>₹{p.price}</b>
                  </td>
                  <td className="px-4 py-3">
                    {p.active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                        <Eye className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400">
                        <EyeOff className="h-3.5 w-3.5" /> Hidden
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/products/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                      <DeleteProductButton id={p.id} title={p.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-[var(--shadow-card)]">
      <Icon className="h-5 w-5 text-brand-500" />
      <p className="mt-2 text-2xl font-extrabold text-brand-900">{value}</p>
      <p className="font-deva text-xs text-brand-400">{label}</p>
    </div>
  );
}

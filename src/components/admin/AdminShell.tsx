import Link from "next/link";
import Image from "next/image";
import { BookOpen, ClipboardCheck, ExternalLink, LayoutDashboard, LogOut, Settings, ShoppingBag } from "lucide-react";
import { signOutAction } from "@/app/dashboard/actions";

export type AdminSection = "overview" | "products" | "orders" | "setup" | "launch";

const navigation = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview", key: "overview" },
  { href: "/dashboard/products", icon: BookOpen, label: "Products", key: "products" },
  { href: "/dashboard/orders", icon: ShoppingBag, label: "Orders", key: "orders" },
  { href: "/dashboard/setup", icon: Settings, label: "Setup", key: "setup" },
  { href: "/dashboard/launch", icon: ClipboardCheck, label: "Launch", key: "launch" },
] as const;

export default function AdminShell({ active, title, description, action, children }: {
  active: AdminSection;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-50/40">
      <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            <Image src="/brand/logo.png" alt="कायद्याचं आणि फायद्याचं" width={662} height={115} className="h-7 w-auto max-w-[170px] object-contain sm:h-8" priority />
            <span className="hidden rounded-full bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-500 lg:inline">Admin</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/" target="_blank" aria-label="View public website" className="rounded-lg p-2 text-brand-500 hover:bg-brand-50"><ExternalLink className="h-4 w-4" /></Link>
            <form action={signOutAction}><button type="submit" aria-label="Sign out" className="rounded-lg p-2 text-danger-600 hover:bg-danger-500/10"><LogOut className="h-4 w-4" /></button></form>
          </div>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2" aria-label="Dashboard navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${active === item.key ? "bg-brand-teal text-white" : "text-brand-600 hover:bg-brand-50"}`}>
              <item.icon className="h-4 w-4" aria-hidden="true" /> {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="text-2xl font-extrabold text-brand-900 sm:text-3xl">{title}</h1>{description && <p className="mt-1 max-w-2xl text-sm text-brand-500">{description}</p>}</div>
          {action}
        </div>
        {children}
      </main>
    </div>
  );
}

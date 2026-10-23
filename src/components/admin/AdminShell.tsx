import Link from "@/components/admin/AdminLink";
import Image from "next/image";
import { BarChart3, BookOpen, ClipboardCheck, ExternalLink, Inbox, LayoutDashboard, LogOut, MessageCircle, Settings, ShoppingBag, Users } from "lucide-react";
import { signOutAction } from "@/app/dashboard/actions";

export type AdminSection = "overview" | "analytics" | "products" | "orders" | "whatsapp" | "leads" | "messages" | "setup" | "launch";

const navigation = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview", key: "overview" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics", key: "analytics" },
  { href: "/dashboard/products", icon: BookOpen, label: "Products", key: "products" },
  { href: "/dashboard/orders", icon: ShoppingBag, label: "Orders", key: "orders" },
  { href: "/dashboard/whatsapp", icon: MessageCircle, label: "WhatsApp", key: "whatsapp" },
  { href: "/dashboard/leads", icon: Users, label: "Leads", key: "leads" },
  { href: "/dashboard/messages", icon: Inbox, label: "Messages", key: "messages" },
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
        {/* Phones: 2 rows (5 + 4, icon above the label, every page visible, no sideways scrolling); wider screens: one row. */}
        <nav className="mx-auto grid max-w-7xl grid-cols-5 gap-1 px-2 pb-2 sm:flex sm:flex-wrap sm:px-4" aria-label="Dashboard navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} aria-current={active === item.key ? "page" : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[10px] font-semibold leading-tight transition min-[400px]:text-[11px] sm:flex-row sm:gap-1.5 sm:justify-start sm:px-3 sm:py-2 sm:text-sm ${active === item.key ? "bg-brand-teal text-white" : "text-brand-600 hover:bg-brand-50"}`}>
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" /> <span className="max-w-full truncate">{item.label}</span>
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-2xl font-extrabold text-brand-900 sm:text-3xl">{title}</h1>{description && <p className="mt-1 max-w-2xl text-sm text-brand-500">{description}</p>}</div>
          {action}
        </div>
        {children}
      </main>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, ShoppingBag, ExternalLink, LogOut } from "lucide-react";
import { signOutAction } from "@/app/dashboard/actions";

export default function AdminShell({
  active,
  title,
  action,
  children,
}: {
  active: "products" | "orders";
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-50/40">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-brand-100 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo.png"
              alt="कायद्याचं आणि फायद्याचं"
              width={662}
              height={115}
              className="h-8 w-auto object-contain"
            />
            <span className="hidden rounded-full bg-brand-teal/5 px-2.5 py-1 text-xs font-bold text-brand-teal sm:inline">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-1">
            <NavLink
              href="/dashboard"
              icon={LayoutDashboard}
              label="Products"
              active={active === "products"}
            />
            <NavLink
              href="/dashboard/orders"
              icon={ShoppingBag}
              label="Orders"
              active={active === "orders"}
            />
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-brand-500 hover:bg-brand-50"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">View site</span>
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-danger-600 hover:bg-danger-500/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-extrabold text-brand-900">{title}</h1>
          {action}
        </div>
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-brand-teal text-white"
          : "text-brand-600 hover:bg-brand-50"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

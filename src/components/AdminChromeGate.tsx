"use client";

import { usePathname } from "next/navigation";

/** Renders public site chrome everywhere EXCEPT the /dashboard admin area. */
export default function AdminChromeGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;
  return <>{children}</>;
}

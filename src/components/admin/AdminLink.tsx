import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Link for admin pages: never prefetched. In production Next.js prefetches
 * every Link that scrolls into view; on the Orders page (≈200 cards, each
 * linking to its order) that meant hundreds of background requests, each one
 * running the login check against Supabase. Admin pages load when tapped.
 */
export default function AdminLink(props: ComponentProps<typeof Link>) {
  return <Link prefetch={false} {...props} />;
}

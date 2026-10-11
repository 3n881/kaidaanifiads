"use client"; // Error boundaries must be Client Components

import StaleAwareError from "@/components/StaleAwareError";

export default function DashboardError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <StaleAwareError {...props} />;
}

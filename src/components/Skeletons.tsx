export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
      <div className="aspect-[3/4] w-full animate-pulse bg-brand-100" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-4/5 animate-pulse rounded bg-brand-100" />
        <div className="h-3 w-full animate-pulse rounded bg-brand-50" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-brand-50" />
        <div className="h-9 w-full animate-pulse rounded-xl bg-brand-100" />
      </div>
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="container-x py-10">
      <div className="mb-6 space-y-3">
        <div className="h-8 w-72 max-w-full animate-pulse rounded bg-brand-100" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-brand-50" />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="container-x py-8">
      <div className="mb-6 h-3 w-48 animate-pulse rounded bg-brand-100" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr]">
        <div className="aspect-[3/4] w-full animate-pulse rounded-2xl bg-brand-100" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 animate-pulse rounded bg-brand-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-brand-50" />
          <div className="h-40 w-full animate-pulse rounded-2xl bg-brand-50" />
          <div className="h-24 w-full animate-pulse rounded-2xl bg-brand-50" />
        </div>
      </div>
    </div>
  );
}

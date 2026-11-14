// Supabase answers at most 1,000 rows per request (the project's "max rows"
// setting), whatever `.limit()` asks for. Dashboard totals that read every
// order / WhatsApp record since go-live must page through with `.range()`.
// Found 14 Nov: 2,741 orders, but every "All time" number read only 1,000.

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string; code?: string } | null }>;
// The query builder, after select / filters / a STABLE order (always end with a
// unique column, e.g. `.order("created_at").order("id")`, so pages never overlap).
type Rangeable<T> = { range: (from: number, to: number) => PageResult<T> };

const PAGE = 1000;
const PARALLEL = 4;

/**
 * Every row of a query, 1,000 at a time. `build` must return a NEW builder each
 * call (a builder runs once). Order ascending by time + id so rows added while
 * reading only append at the end. Stops at `max` rows.
 */
export async function fetchAll<T>(
  build: () => Rangeable<T>,
  max = 200_000,
): Promise<{ data: T[]; error: { message: string; code?: string } | null }> {
  const first = await build().range(0, PAGE - 1);
  if (first.error) return { data: [], error: first.error };
  const rows: T[] = [...(first.data ?? [])];
  if ((first.data ?? []).length < PAGE) return { data: rows, error: null };

  for (let from = PAGE; from < max; from += PAGE * PARALLEL) {
    const batch = await Promise.all(
      Array.from({ length: PARALLEL }, (_, i) => from + i * PAGE)
        .filter((start) => start < max)
        .map((start) => build().range(start, start + PAGE - 1)),
    );
    for (const page of batch) {
      if (page.error) return { data: [], error: page.error };
      rows.push(...(page.data ?? []));
    }
    if (batch.some((page) => (page.data ?? []).length < PAGE)) break;
  }
  return { data: rows, error: null };
}

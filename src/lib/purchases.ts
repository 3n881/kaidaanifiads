// ---------------------------------------------------------------------------
// CLIENT-SAFE: remembers this device's orders in localStorage so a buyer can
// get back to their download (refresh, closed tab, Instagram browser) without
// an account. Holds only order id + signed access token + title.
// ---------------------------------------------------------------------------

const KEY = "kaf-orders";
const MAX_ENTRIES = 30;

export interface SavedOrder {
  orderId: string;
  token: string;
  title: string;
  savedAt: number;
}

export function getSavedOrders(): SavedOrder[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedOrder[]) : [];
    return Array.isArray(list) ? list.filter((o) => o?.orderId && o?.token) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: Omit<SavedOrder, "savedAt">): void {
  try {
    const rest = getSavedOrders().filter((o) => o.orderId !== order.orderId);
    const next = [{ ...order, savedAt: Date.now() }, ...rest].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode / storage blocked — the order page URL still works.
  }
}

export function orderHref(order: Pick<SavedOrder, "orderId" | "token">): string {
  return `/order/${order.orderId}?t=${order.token}`;
}

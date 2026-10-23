// First-party visit funnel (Dashboard → Analytics, migration 016) — browser only.
// A random visitor id + a visit id in localStorage, and how the visit arrived
// (utm_* tags, Meta's fbclid, the referring site), kept for the whole visit
// (first touch). No name, phone or anything typed is ever sent. Events go out
// with navigator.sendBeacon when the browser is idle, so they never delay a page.
// Private pages (order / my-books / dashboard) are skipped.

import { isPrivatePath } from "./meta-pixel";

export type VisitEvent = "visit" | "book_view" | "buy_tap" | "details" | "razorpay_open";

export interface VisitSource {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  from_ad?: boolean;
  referrer_host?: string;
}

interface Visit {
  id: string;
  /** Last activity (ms) — a visit ends after 30 idle minutes. */
  at: number;
  source: VisitSource;
}

const VISITOR_KEY = "kaf-vid";
const VISIT_KEY = "kaf-visit";
const VISIT_IDLE_MS = 30 * 60 * 1000;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

const randomId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const clip = (v: string | null) => (v ? v.trim().slice(0, 100) : undefined) || undefined;

/** How this page was reached, from its URL and referrer. Empty when it carries nothing. */
function sourceFromLanding(): VisitSource {
  const params = new URLSearchParams(window.location.search);
  const source: VisitSource = {};
  for (const key of UTM_KEYS) {
    const value = clip(params.get(key));
    if (value) source[key] = value;
  }
  if (params.has("fbclid")) source.from_ad = true;
  try {
    const host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
    if (host && host !== window.location.hostname.replace(/^www\./, "")) source.referrer_host = host.slice(0, 100);
  } catch {
    // unreadable referrer: no referring site
  }
  return source;
}

const sameCampaign = (a: VisitSource, b: VisitSource) =>
  UTM_KEYS.every((k) => (a[k] ?? "") === (b[k] ?? "")) && Boolean(a.from_ad) === Boolean(b.from_ad);

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode / storage full: the ids just won't survive this page
  }
}

/** The current visit; starts a new one after 30 idle minutes or when a new campaign link is opened. */
function currentVisit(now: number): { visit: Visit; isNew: boolean } {
  const landing = sourceFromLanding();
  const tagged = UTM_KEYS.some((k) => landing[k]) || landing.from_ad;
  const saved = read<Visit>(VISIT_KEY);
  const alive = saved && typeof saved.id === "string" && now - saved.at < VISIT_IDLE_MS;
  if (alive && !(tagged && !sameCampaign(landing, saved.source))) {
    const visit = { ...saved, at: now };
    write(VISIT_KEY, visit);
    return { visit, isNew: false };
  }
  const visit: Visit = { id: randomId(), at: now, source: landing };
  write(VISIT_KEY, visit);
  return { visit, isNew: true };
}

function visitorId(): string {
  const saved = read<string>(VISITOR_KEY);
  if (typeof saved === "string" && saved) return saved;
  const id = randomId();
  write(VISITOR_KEY, id);
  return id;
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // fall through to fetch
  }
  void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}

const whenIdle = (fn: () => void) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 3000 });
  else window.setTimeout(fn, 1200);
};

/**
 * Records one funnel step. The first step of every visit also records "visit"
 * (with the landing page), so callers never need to.
 * `immediate` skips the idle wait (steps right before a payment window opens).
 */
export function trackVisit(name: Exclude<VisitEvent, "visit"> | "page", productId?: number, immediate = false): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (isPrivatePath(path)) return;
  // Read the landing details now (the URL can change before the idle callback).
  const { visit, isNew } = currentVisit(Date.now());
  const run = () => {
    const base = { visitorId: visitorId(), visitId: visit.id, path: path.slice(0, 200), ...visit.source };
    if (isNew) send({ ...base, name: "visit" });
    if (name !== "page") send({ ...base, name, productId });
  };
  if (immediate) run();
  else whenIdle(run);
}

/** Visit id + campaign tags for /api/checkout, so the order is credited to the campaign. */
export function visitForCheckout(): ({ visitId: string } & VisitSource) | null {
  if (typeof window === "undefined") return null;
  const saved = read<Visit>(VISIT_KEY);
  return saved && typeof saved.id === "string" ? { visitId: saved.id, ...saved.source } : null;
}

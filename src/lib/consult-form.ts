// CLIENT-SAFE: consultation booking form rules (page + API use the same checks).
import { cleanBuyerName, cleanIndianMobile } from "./buyer";
import { LOCALES, type Locale } from "./i18n";
import { isTopic, MODES, SLOTS, type Mode, type Slot, type Topic } from "./consult-copy";

export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 1000;
export const MAX_DAYS_AHEAD = 14;

export type ConsultForm = {
  topic: Topic;
  name: string;
  phone: string;
  district: string;
  description: string;
  date: string; // YYYY-MM-DD (IST)
  slot: Slot;
  mode: Mode;
  language: Locale;
  consent: boolean;
};
export type ConsultField = "name" | "phone" | "district" | "description" | "date" | "consent";

/** Today in India as YYYY-MM-DD. */
export function istToday(now = Date.now()): string {
  return new Date(now + 5.5 * 3600e3).toISOString().slice(0, 10);
}
export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
}
/** Bookable days: tomorrow … +14 days. */
export function dayRange(now = Date.now()): { min: string; max: string } {
  const today = istToday(now);
  return { min: addDays(today, 1), max: addDays(today, MAX_DAYS_AHEAD) };
}

export function checkConsult(input: Partial<Record<keyof ConsultForm, unknown>>, now = Date.now()): { form: ConsultForm; bad: ConsultField[] } {
  const text = (v: unknown, max: number) => String(v ?? "").normalize("NFC").replace(/[ \t]+/g, " ").trim().slice(0, max);
  const district = text(input.district, 60);
  const description = text(input.description, DESCRIPTION_MAX);
  const date = String(input.date ?? "");
  const { min, max } = dayRange(now);
  const form: ConsultForm = {
    topic: isTopic(input.topic) ? input.topic : "other",
    name: cleanBuyerName(input.name),
    phone: cleanIndianMobile(input.phone),
    district: (district.match(/\p{L}/gu)?.length ?? 0) >= 2 ? district : "",
    description: (description.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= DESCRIPTION_MIN ? description : "",
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= min && date <= max ? date : "",
    slot: (SLOTS as readonly string[]).includes(String(input.slot)) ? (input.slot as Slot) : "morning",
    mode: (MODES as readonly string[]).includes(String(input.mode)) ? (input.mode as Mode) : "phone",
    language: (LOCALES as readonly string[]).includes(String(input.language)) ? (input.language as Locale) : "mr",
    consent: input.consent === true,
  };
  const bad: ConsultField[] = [];
  if (!form.name) bad.push("name");
  if (!form.phone) bad.push("phone");
  if (!form.district) bad.push("district");
  if (!form.description) bad.push("description");
  if (!form.date) bad.push("date");
  if (!form.consent) bad.push("consent");
  return { form, bad };
}

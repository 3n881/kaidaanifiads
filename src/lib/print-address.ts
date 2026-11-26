// CLIENT-SAFE: delivery address rules for printed-book orders. The checkout
// page and the (phase 2) API use the same checks, so what the buyer sees
// accepted is what the server accepts.
import { cleanBuyerName, cleanIndianMobile } from "./buyer";

export const INDIAN_STATES = [
  "Maharashtra", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const;

export type PrintAddress = {
  name: string;
  phone: string;
  house: string;
  area: string;
  landmark: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
};

export type AddressField = keyof PrintAddress;

const text = (raw: unknown, max: number) => String(raw ?? "").normalize("NFC").replace(/\s+/g, " ").trim().slice(0, max);
/** A free-text address part: at least 2 letters or digits. */
const part = (raw: unknown, max = 120) => {
  const value = text(raw, max);
  return (value.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 2 ? value : "";
};

/** Indian PIN code: 6 digits, first 1–9. */
export function cleanPincode(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return /^[1-9]\d{5}$/.test(digits) ? digits : "";
}

/** The cleaned address and the fields that are wrong (empty = all good). */
export function checkAddress(input: Partial<Record<AddressField, unknown>>): { address: PrintAddress; bad: AddressField[] } {
  const address: PrintAddress = {
    name: cleanBuyerName(input.name),
    phone: cleanIndianMobile(input.phone),
    house: part(input.house),
    area: part(input.area),
    landmark: text(input.landmark, 120),
    pincode: cleanPincode(input.pincode),
    city: part(input.city, 60),
    district: part(input.district, 60),
    state: (INDIAN_STATES as readonly string[]).includes(String(input.state)) ? String(input.state) : "",
  };
  const required: AddressField[] = ["name", "phone", "house", "area", "pincode", "city", "district", "state"];
  return { address, bad: required.filter((field) => !address[field]) };
}

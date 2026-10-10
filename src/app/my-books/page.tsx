import type { Metadata } from "next";
import { getCombos } from "@/lib/products";
import MyBooksClient from "./MyBooksClient";

export const revalidate = 300;

export const metadata: Metadata = { title: "माझी पुस्तके" };

export default async function MyBooksPage() {
  let combos: Awaited<ReturnType<typeof getCombos>> = [];
  try {
    combos = await getCombos();
  } catch {
    combos = [];
  }
  return <MyBooksClient combos={combos} />;
}

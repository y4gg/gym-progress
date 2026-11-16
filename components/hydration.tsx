"use client";
import { useStoreHydrated } from "@/lib/use-store-hydrated";

export default function Hydration() {
  useStoreHydrated();
  return null;
}

import type { DataMode } from "@/types";

/** DEMO_MODE=true 이거나 Supabase 설정이 없으면 데모 모드. */
export function getDataMode(): DataMode {
  if (process.env.DEMO_MODE === "true") return "demo";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return "demo";
  return "live";
}

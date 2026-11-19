import "server-only";
import { getDataMode } from "@/lib/env";
import { demoAdapter } from "./demo-adapter";
import { supabaseAdapter } from "./supabase-adapter";
import type { DataAdapter } from "./types";

/** 서버 컴포넌트와 API 라우트가 공유하는 단일 데이터 진입점 */
export function getData(): DataAdapter {
  return getDataMode() === "demo" ? demoAdapter : supabaseAdapter;
}

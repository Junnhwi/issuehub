import { existsSync } from "node:fs";

/** 로컬 실행 시 .env.local을 읽는다(GitHub Actions에서는 Secrets가 환경 변수로 주입됨) */
export function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    if (existsSync(f)) {
      process.loadEnvFile(f);
      return;
    }
  }
}

export function intEnv(name: string, fallback: number, max: number) {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

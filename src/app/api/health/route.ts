import { getData } from "@/lib/data";
import { getDataMode } from "@/lib/env";
import { handle, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** 상태, 데이터 모드, 최신 성공 수집 시각. 비밀값·설정 여부의 세부 내용은 노출하지 않는다. */
export function GET() {
  return handle(async () => {
    const stats = await getData().getStats();
    return ok({ status: "ok", mode: getDataMode(), lastSuccessfulSyncAt: stats.lastSuccessfulSyncAt }, { asOf: stats.lastSuccessfulSyncAt }, 0);
  });
}

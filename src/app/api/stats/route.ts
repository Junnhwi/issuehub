import { getData } from "@/lib/data";
import { handle, ok } from "@/lib/api";

export function GET() {
  return handle(async () => {
    const stats = await getData().getStats();
    return ok(stats, { asOf: stats.lastSuccessfulSyncAt });
  });
}

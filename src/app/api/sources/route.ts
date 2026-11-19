import { getData } from "@/lib/data";
import { handle, ok } from "@/lib/api";

export function GET() {
  return handle(async () => {
    const sources = await getData().listSources();
    return ok(sources.map(({ slug, name, kind, tier, homepageUrl, lastFetchedAt }) => ({ slug, name, kind, tier, homepageUrl, lastFetchedAt })), {}, 300);
  });
}

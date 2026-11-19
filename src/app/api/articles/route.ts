import { getData } from "@/lib/data";
import { handle, ok, parseQuery } from "@/lib/api";
import { articleListSchema } from "@/lib/validation/params";

export function GET(req: Request) {
  return handle(async () => {
    const parsed = parseQuery(articleListSchema, req.url);
    if (!parsed.ok) return parsed.response;
    const page = await getData().listArticles(parsed.value);
    return ok(page.items, { nextCursor: page.nextCursor, asOf: page.asOf });
  });
}

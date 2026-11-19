import { getData } from "@/lib/data";
import { fail, handle, ok } from "@/lib/api";
import { uuidSchema } from "@/lib/validation/params";

export function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    if (!uuidSchema.safeParse(id).success) return fail(400, "INVALID_ID", "id는 UUID여야 합니다.");
    const res = await getData().getArticle(id);
    if (!res) return fail(404, "NOT_FOUND", "기사를 찾을 수 없습니다.");
    return ok({ ...res.article, related: res.related });
  });
}

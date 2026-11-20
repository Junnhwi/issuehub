import { z } from "zod";
import { getData } from "@/lib/data";
import { handle, ok, parseQuery } from "@/lib/api";
import { GAME_LIST_SLUGS } from "@/lib/games";

const schema = z.object({ list: z.enum(GAME_LIST_SLUGS).default("most_played") });

export function GET(req: Request) {
  return handle(async () => {
    const parsed = parseQuery(schema, req.url);
    if (!parsed.ok) return parsed.response;
    const { items, asOf } = await getData().listGames(parsed.value.list);
    return ok(items, { asOf });
  });
}

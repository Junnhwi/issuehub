import { getData } from "@/lib/data";
import { handle, ok } from "@/lib/api";

export function GET() {
  return handle(async () => ok(await getData().listTopics(), {}, 300));
}

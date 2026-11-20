import { Gamepad2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getData } from "@/lib/data";
import { GAME_LISTS, GAME_LIST_SLUGS } from "@/lib/games";
import { cn } from "@/lib/utils";
import { GameRow } from "@/components/games/game-row";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { PageHeader } from "@/components/ui/page-header";
import type { GameList } from "@/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "게임 동향" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function GamesPage({ searchParams }: { searchParams: SP }) {
  const raw = (await searchParams).list;
  const list: GameList = (GAME_LIST_SLUGS as string[]).includes(String(raw)) ? (raw as GameList) : "most_played";
  const current = GAME_LISTS.find((l) => l.slug === list)!;
  const { items, asOf } = await getData().listGames(list);
  const demo = items.some((g) => g.isDemo);

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <span>Games · Steam</span>
            {asOf && (
              <>
                <span aria-hidden>·</span>
                <span>
                  수집 <LocalTime iso={asOf} />
                </span>
              </>
            )}
          </>
        }
        title="게임 동향"
        description="지금 많이 하는 게임, 잘 팔리는 게임, 새로 나온 게임과 출시 예정작을 Steam 공개 데이터로 모았습니다. 평가와 동시접속자는 Steam이 공개한 값 그대로입니다."
      />

      <nav aria-label="게임 목록" className="-mx-4 mb-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        <ul className="flex gap-1.5 [&>li]:shrink-0">
          {GAME_LISTS.map((l) => {
            const on = l.slug === list;
            return (
              <li key={l.slug}>
                <Link
                  href={l.slug === "most_played" ? "/games" : `/games?list=${l.slug}`}
                  scroll={false}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center rounded-full border px-4 text-[13.5px] font-medium transition-colors md:h-9",
                    on ? "border-transparent bg-fg text-bg" : "border-line bg-surface text-fg-2 hover:border-line-strong hover:text-fg",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="mb-4 text-[13px] text-muted">
        {current.description} · {items.length}개
        {demo && <span className="ml-1.5 font-medium text-warning">· 가상의 데모 게임입니다</span>}
      </p>

      {items.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {items.map((g, i) => (
            <GameRow key={g.appid} game={g} rank={list === "new_releases" ? undefined : (g.ranks[list] ?? i + 1)} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Gamepad2}
          title="아직 수집된 게임이 없습니다"
          description="Supabase에 0006_steam_games.sql을 적용한 뒤 수집이 실행되면 이곳에 표시됩니다."
        />
      )}
    </div>
  );
}

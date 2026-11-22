import { ArrowLeft, ExternalLink, Gamepad2, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getData } from "@/lib/data";
import { formatWon, salePeriods } from "@/lib/games";
import { GameTags, ReviewBadge } from "@/components/games/game-row";
import { PriceChart } from "@/components/games/price-chart";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ appid: string }> };

async function load(raw: string) {
  const appid = Number(raw);
  if (!Number.isInteger(appid) || appid <= 0 || appid > 2_147_483_647) return null;
  return getData().getGame(appid);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await load((await params).appid);
  return { title: res ? `${res.game.name} 가격 추이` : "게임을 찾을 수 없음" };
}

const day = (iso: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric" }).format(Date.parse(iso));
const days = (a: string, b: string | null, now: number) => Math.max(1, Math.round(((b ? Date.parse(b) : now) - Date.parse(a)) / 86_400_000));

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="tabular mt-1 font-mono text-[20px] font-semibold text-fg">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted">{hint}</dd>}
    </div>
  );
}

export default async function GamePage({ params }: Props) {
  const res = await load((await params).appid);
  if (!res) notFound();
  const { game: g, history } = res;
  // eslint-disable-next-line react-hooks/purity -- 서버 렌더 시점 기준 "오늘"
  const now = Date.now();
  const sales = salePeriods(history);
  const low = history.length ? history.reduce((m, p) => (p.price < m.price ? p : m)) : null;
  const latest = history.at(-1);
  const recent = [...sales].reverse();

  return (
    <div className="mx-auto max-w-[1040px]">
      <Link href="/games" className="mb-6 inline-flex h-9 items-center gap-1.5 rounded-lg text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        게임 동향으로
      </Link>

      <header className="grid gap-5 sm:grid-cols-[280px_minmax(0,1fr)]">
        <div className="aspect-[460/215] overflow-hidden rounded-xl border border-line bg-elevated">
          {g.headerImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={g.headerImage} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted">
              <Gamepad2 className="size-10" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold leading-tight tracking-tight md:text-[28px]">{g.name}</h1>
          <GameTags tags={g.tags} />
          {(g.descriptionKo ?? g.description) && (
            <p className="mt-3 text-[15px] leading-relaxed text-fg-2" lang={g.descriptionKo ? "ko" : undefined}>
              {g.descriptionKo ?? g.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <ReviewBadge game={g} />
            {g.currentPlayers !== null && g.currentPlayers > 0 && (
              <span className="tabular inline-flex items-center gap-1 text-[13px] text-fg-2">
                <Users className="size-3.5 text-muted" aria-hidden />
                현재 동시접속 {g.currentPlayers.toLocaleString("ko-KR")}명
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={g.storeUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md")}>
              {g.isDemo ? "예시 링크" : "Steam 상점"}
              <ExternalLink className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      </header>

      <section className="mt-10" aria-labelledby="price-title">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="price-title" className="text-[17px] font-semibold">
            한국 Steam 가격 추이
          </h2>
          {g.isDemo && <span className="text-[13px] font-medium text-warning">가상의 데모 가격입니다</span>}
        </div>

        {g.isFree ? (
          <p className="text-[14px] text-muted">무료 게임이라 가격 추이가 없습니다.</p>
        ) : g.comingSoon ? (
          <p className="text-[14px] text-muted">아직 출시 전이라 가격 기록이 없습니다.</p>
        ) : history.length === 0 ? (
          <EmptyState
            title="아직 가격 기록이 없습니다"
            description="IsThereAnyDeal에서 이 게임의 한국 Steam 가격 기록을 아직 가져오지 않았거나, 기록이 없는 게임입니다."
          />
        ) : (
          <>
            <dl className="my-4 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-4 sm:grid-cols-4">
              <Stat
                label="현재 가격 · Steam 상점"
                value={g.price?.replace("₩ ", "₩") ?? formatWon(latest!.price)}
                hint={g.discountPct ? (g.discountEndsAt ? <>-{g.discountPct}% · {day(g.discountEndsAt)}까지</> : <>-{g.discountPct}% 세일 중</>) : "정가"}
              />
              <Stat label="정가" value={formatWon(latest!.regular)} />
              <Stat label="기록상 최저가" value={formatWon(low!.price)} hint={low!.cut ? `-${low!.cut}% · ${day(low!.changedAt)}` : "할인 기록 없음"} />
              <Stat label="세일 횟수" value={`${sales.length}회`} hint={`기록 시작 ${day(history[0].changedAt)}`} />
            </dl>

            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-fg-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-5 rounded-full bg-accent" aria-hidden />
                실제 가격
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 border-t-[1.5px] border-dashed border-muted" aria-hidden />
                정가
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-4 rounded-sm bg-accent-soft" aria-hidden />
                세일 기간
              </span>
              <span className="text-muted">그래프는 옆으로 밀거나(휠·막대·터치) 이동합니다 · 정확한 날짜와 가격은 아래 세일 기록 표에 있습니다</span>
            </div>
            <div className="rounded-xl border border-line bg-surface px-2 pt-3">
              <PriceChart points={history} sales={sales} now={now} />
            </div>

            <h3 className="mb-2 mt-6 text-[15px] font-semibold">세일 기록 {sales.length ? `(최근 순, ${sales.length}회)` : ""}</h3>
            {sales.length ? (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[480px] text-left text-[13.5px]">
                  <thead className="bg-elevated/60 text-[12.5px] text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">시작</th>
                      <th className="px-3 py-2 font-medium">종료</th>
                      <th className="px-3 py-2 font-medium">기간</th>
                      <th className="px-3 py-2 text-right font-medium">할인율</th>
                      <th className="px-3 py-2 text-right font-medium">최저 세일가</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recent.map((s) => (
                      <tr key={s.start}>
                        <td className="tabular px-3 py-2">{day(s.start)}</td>
                        <td className="tabular px-3 py-2">{s.end ? day(s.end) : g.discountEndsAt ? `${day(g.discountEndsAt)} 예정` : "진행 중"}</td>
                        <td className="tabular px-3 py-2 text-muted">{days(s.start, s.end, now)}일</td>
                        <td className="tabular px-3 py-2 text-right font-mono font-semibold">{s.minCut !== s.cut ? `-${s.minCut}~${s.cut}%` : `-${s.cut}%`}</td>
                        <td className="tabular px-3 py-2 text-right font-mono">{formatWon(s.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[14px] text-muted">기록된 기간 동안 할인이 없었습니다.</p>
            )}
          </>
        )}

        <p className="mt-4 text-xs leading-relaxed text-muted">
          가격 기록: <a href="https://isthereanydeal.com/" target="_blank" rel="noopener noreferrer" className="text-accent-fg hover:underline">IsThereAnyDeal</a> API의 한국(KR) Steam 원화 기록을 그대로 표시합니다. &lsquo;기록상 최저가&rsquo;와 세일 횟수는 기록이 시작된 날 이후만 셉니다(KR 기록은 2024년 12월부터). 현재 가격과 세일 종료 예정일은 Steam 상점 값이며, 종료 예정일은 실제 종료 기록과 다를 수 있습니다. IssueHub는 IsThereAnyDeal과 제휴 관계가 아닙니다.
          {!g.isDemo && latest && (
            <>
              {" "}
              마지막 확인 <LocalTime iso={g.lastSyncedAt} />.
            </>
          )}
        </p>
      </section>
    </div>
  );
}

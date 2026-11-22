import { ArrowLeft, BookOpenText, CircleDashed, CircleSlash, ExternalLink, GitFork, Info, Layers, ListChecks, Rocket, Star, Target, TriangleAlert, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getData } from "@/lib/data";
import { uuidSchema } from "@/lib/validation/params";
import { formatSigned } from "@/lib/utils";
import type { AiReadRecord, RepoGuide } from "@/types";
import { TopicTag } from "@/components/articles/badges";
import { BookmarkButton } from "@/components/articles/bookmark-button";
import { GrowthBadge, LanguageDot, OwnerAvatar, repoBookmark } from "@/components/github/repo-card";
import { buttonClass } from "@/components/ui/button";
import { LocalTime } from "@/components/ui/local-time";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!uuidSchema.safeParse(id).success) return null;
  return getData().getRepo(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await load((await params).id);
  return { title: res ? res.repo.fullName : "저장소를 찾을 수 없음" };
}

/** 관측한 Star 수 추이(서버 SVG). 스냅샷이 2개 미만이면 그리지 않는다 */
function StarTrend({ points }: { points: { capturedDate: string; starsCount: number }[] }) {
  if (points.length < 2) return <p className="text-sm text-muted">관측 스냅샷이 2개 이상 쌓이면 추이를 그립니다.</p>;
  const W = 640;
  const H = 120;
  const min = Math.min(...points.map((p) => p.starsCount));
  const max = Math.max(...points.map((p) => p.starsCount));
  const span = Math.max(1, max - min);
  const xy = points.map((p, i) => [8 + (i / (points.length - 1)) * (W - 16), 10 + (1 - (p.starsCount - min) / span) * (H - 20)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points.at(-1)!;
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full" role="img" aria-label={`${first.capturedDate} ${first.starsCount}개에서 ${last.capturedDate} ${last.starsCount}개`}>
        <defs>
          <linearGradient id="star-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L${xy.at(-1)![0]},${H} L${xy[0][0]},${H} Z`} fill="url(#star-fill)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {xy.map(([x, y], i) => (
          <circle key={points[i].capturedDate} cx={x} cy={y} r={3} fill="var(--accent)">
            <title>{`${points[i].capturedDate} · ★ ${points[i].starsCount.toLocaleString("ko-KR")}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-muted">
        <span className="tabular">{first.capturedDate} · ★ {first.starsCount.toLocaleString("ko-KR")}</span>
        <span className="tabular">
          {last.capturedDate} · ★ {last.starsCount.toLocaleString("ko-KR")} ({formatSigned(last.starsCount - first.starsCount)})
        </span>
      </figcaption>
    </figure>
  );
}

function Block({ icon: Icon, title, children }: { icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2.5 flex items-center gap-2 text-[15px] font-semibold">
        <Icon className="size-4 text-accent-fg" aria-hidden />
        {title}
      </h3>
      {children}
    </div>
  );
}

const SKIP: Record<string, string> = {
  NO_README: "이 저장소에는 README가 없습니다.",
  README_TOO_SHORT: "README가 너무 짧아 활용 가이드를 만들 근거가 부족합니다.",
  MODEL_INSUFFICIENT: "README만으로는 무엇을 하는 프로젝트인지 알 수 없어 가이드를 만들지 않았습니다.",
};

function GuidePanel({ record }: { record: AiReadRecord<RepoGuide> | null }) {
  if (!record || record.status !== "completed" || !record.content) {
    const Icon = !record ? CircleDashed : record.status === "skipped" ? CircleSlash : TriangleAlert;
    const text = !record
      ? "매시 20분 수집 때 Star가 많은 저장소부터 README를 읽고 활용 가이드를 만듭니다. 잠시 후 다시 확인해 주세요."
      : record.status === "skipped"
        ? (SKIP[record.error ?? ""] ?? "활용 가이드를 만들 수 없는 저장소입니다.")
        : "만든 가이드가 README 대조 검사를 통과하지 못해 저장하지 않았습니다. 다음 수집 때 다시 시도합니다.";
    return (
      <section className="rounded-2xl border border-dashed border-line-strong p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <Icon className="size-[18px] text-muted" aria-hidden />
          README 활용 가이드 {record ? "없음" : "준비 중"}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
      </section>
    );
  }
  const g = record.content;
  return (
    <section aria-labelledby="guide-title" className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="banner border-b border-line px-5 py-5 md:px-6">
        <div className="banner-grid" aria-hidden />
        <h2 id="guide-title" className="flex items-center gap-2 text-[17px] font-bold">
          <BookOpenText className="size-5 text-accent-fg" aria-hidden />
          README 활용 가이드
        </h2>
        <p className="mt-1 text-[13px] text-muted">{record.isDemo ? "데모 예시 · AI 생성 아님" : <>README를 읽고 작성 · <LocalTime iso={record.updatedAt} /></>}</p>
        <p className="mt-4 text-[16.5px] leading-[1.85] text-fg">{g.whatItIs}</p>
      </div>
      <div className="grid gap-8 px-5 py-6 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rise rounded-xl border border-line bg-bg/40 p-4" style={{ "--i": 0 } as React.CSSProperties}>
            <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-muted">
              <Target className="size-4" aria-hidden />
              제작자가 풀려는 문제
            </p>
            <p className="text-[15px] leading-relaxed text-fg-2">{g.problem}</p>
          </div>
          {g.audience && (
            <div className="rise rounded-xl border border-line bg-bg/40 p-4" style={{ "--i": 1 } as React.CSSProperties}>
              <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-muted">
                <Users className="size-4" aria-hidden />
                이런 사람에게 유용
              </p>
              <p className="text-[15px] leading-relaxed text-fg-2">{g.audience}</p>
            </div>
          )}
        </div>
        {g.features.length > 0 && (
          <Block icon={ListChecks} title="주요 기능">
            <ul className="grid gap-2 sm:grid-cols-2">
              {g.features.map((f) => (
                <li key={f} className="flex gap-2.5 text-[15px] leading-relaxed text-fg-2">
                  <span className="mt-[10px] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          </Block>
        )}
        {g.useCases.length > 0 && (
          <Block icon={Rocket} title="이렇게 활용할 수 있습니다 · README 근거">
            <ol className="space-y-2.5">
              {g.useCases.map((u, i) => (
                <li key={u} className="flex gap-3 text-[15px] leading-relaxed text-fg-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-[12px] font-semibold text-accent-fg">{i + 1}</span>
                  {u}
                </li>
              ))}
            </ol>
          </Block>
        )}
        {g.gettingStarted.length > 0 && (
          <Block icon={Rocket} title="시작하기">
            <ol className="space-y-3">
              {g.gettingStarted.map((s, i) => (
                <li key={`${i}-${s.step}`}>
                  <p className="text-[15px] text-fg-2">
                    <span className="mr-1.5 font-mono text-muted">{i + 1}.</span>
                    {s.step}
                  </p>
                  {s.command && <pre className="mt-1.5 overflow-x-auto rounded-lg border border-line bg-bg px-3 py-2 font-mono text-[13px] text-fg">{s.command}</pre>}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-muted">명령어는 README에 그대로 있는 것만 보여 줍니다.</p>
          </Block>
        )}
        {g.stack.length > 0 && (
          <Block icon={Layers} title="기술 스택">
            <div className="flex flex-wrap gap-1.5">
              {g.stack.map((s) => (
                <span key={s} className="rounded-full bg-elevated px-2.5 py-1 text-[13px] text-fg-2">
                  {s}
                </span>
              ))}
            </div>
          </Block>
        )}
        {g.limitations && (
          <Block icon={TriangleAlert} title="README로 알 수 없는 것 · 주의">
            <p className="text-[15px] leading-relaxed text-fg-2">{g.limitations}</p>
          </Block>
        )}
        <p className="flex items-start gap-2 rounded-lg bg-elevated px-3 py-2.5 text-[13px] leading-relaxed text-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          AI가 README만 읽고 정리했습니다. 숫자는 README와 자동 대조했지만 실제 동작·품질을 검증한 것은 아닙니다.
        </p>
      </div>
    </section>
  );
}

export default async function RepoPage({ params }: Props) {
  const res = await load((await params).id);
  if (!res) notFound();
  const { repo: r, snapshots, guide } = res;
  const [owner, name] = r.fullName.split("/");

  return (
    <div className="mx-auto max-w-[860px]">
      <Link href="/github" className="mb-6 inline-flex h-9 items-center gap-1.5 rounded-lg text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        GitHub 저장소로
      </Link>

      <header className="flex items-start gap-4">
        <OwnerAvatar repo={r} size={56} />
        <div className="min-w-0">
          <h1 className="break-all text-[24px] font-bold leading-tight tracking-tight md:text-[28px]">
            <span className="font-normal text-muted">{owner}/</span>
            {name}
          </h1>
          {(r.summaryKo || r.description) && <p className="mt-2 text-[15px] leading-relaxed text-fg-2">{r.summaryKo || r.description}</p>}
          {r.topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.topics.map((t) => (
                <TopicTag key={t} slug={t} />
              ))}
            </div>
          )}
        </div>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-line bg-surface/60 p-4 text-[13px] sm:grid-cols-4">
        <div>
          <dt className="text-muted">Stars</dt>
          <dd className="tabular mt-1 inline-flex items-center gap-1 font-mono text-[17px] font-semibold">
            <Star className="size-4 text-muted" aria-hidden />
            {r.starsTotal.toLocaleString("ko-KR")}
          </dd>
        </div>
        <div>
          <dt className="text-muted">관측 증가</dt>
          <dd className="mt-1">
            <GrowthBadge repo={r} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Forks · 언어</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-x-3 text-fg-2">
            <span className="tabular inline-flex items-center gap-1 font-mono">
              <GitFork className="size-3.5" aria-hidden />
              {r.forksTotal.toLocaleString("ko-KR")}
            </span>
            <LanguageDot language={r.language} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">최근 push</dt>
          <dd className="mt-1 font-medium">{r.pushedAt ? <LocalTime iso={r.pushedAt} /> : "정보 없음"}</dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <a href={r.htmlUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md")}>
          {r.isDemo ? "예시 링크" : "GitHub에서 보기"}
          <ExternalLink className="size-4" aria-hidden />
        </a>
        <BookmarkButton item={repoBookmark(r)} withLabel />
      </div>

      <div className="mt-8 space-y-6">
        <GuidePanel record={guide} />
        <section className="rounded-2xl border border-line bg-surface p-5 md:p-6">
          <h2 className="mb-3 text-[15px] font-semibold">관측한 Star 추이</h2>
          <StarTrend points={snapshots} />
          <p className="mt-3 text-xs text-muted">IssueHub가 매일 기록한 스냅샷입니다(GitHub 공식 Trending 아님). 관측을 시작하기 전의 추이는 알 수 없습니다.</p>
        </section>
      </div>
    </div>
  );
}

import { BookOpenText, CheckCircle2, CircleDashed, CircleSlash, GraduationCap, Info, Lightbulb, ListOrdered, Quote, TriangleAlert, Wrench } from "lucide-react";
import type { AiReadRecord, DeepRead } from "@/types";
import { LocalTime } from "@/components/ui/local-time";
import { isOlderThan } from "@/lib/utils";

const SKIP_REASON: Record<string, string> = {
  ROBOTS_DISALLOW: "이 사이트가 robots.txt로 AI 수집을 허용하지 않아 원문을 읽지 않았습니다.",
  NOAI_META: "이 페이지가 AI 이용을 원하지 않는다고 표시해(noai) 원문을 읽지 않았습니다.",
  TOO_SHORT: "원문 본문을 충분히 읽을 수 없었습니다(로그인이 필요하거나 스크립트로 그리는 페이지 등).",
  NO_ARTICLE: "원문 링크가 없는 토론 글이라 해설 대상이 아닙니다. 위의 발췌와 HN 토론을 확인하세요.",
  BAD_URL: "원문 주소를 해석할 수 없었습니다.",
};

function Notice({ icon: Icon, title, children }: { icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-dashed border-line-strong p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <Icon className="size-[18px] text-muted" aria-hidden />
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{children}</p>
    </section>
  );
}

function Heading({ icon: Icon, children }: { icon: typeof Info; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-fg">
      <Icon className="size-4 text-accent-fg" aria-hidden />
      {children}
    </h3>
  );
}

/**
 * AI 원문 해설. 수집 배치가 원문 본문을 읽고 만든 학습용 설명이다.
 * 완료가 아니면 왜 없는지(대기·robots 거부·본문 부족·검증 실패)를 그대로 알린다.
 */
export function DeepReadPanel({ record, fetchedAt }: { record: AiReadRecord<DeepRead> | null; fetchedAt: string }) {
  if (!record) {
    const recent = !isOlderThan(fetchedAt, 72);
    return (
      <Notice icon={CircleDashed} title="AI 원문 해설 준비 중">
        {recent
          ? "수집 후 3일 안의 글은 매시 20분 수집 때 화제순으로 원문을 읽고 해설을 만듭니다. 잠시 후 다시 확인해 주세요."
          : "해설은 수집 후 3일 안의 글에만 만듭니다. 이 글은 요약과 원문 발췌로 확인해 주세요."}
      </Notice>
    );
  }
  if (record.status === "skipped")
    return (
      <Notice icon={CircleSlash} title="AI 원문 해설 없음">
        {SKIP_REASON[record.error ?? ""] ?? "원문을 해설할 수 없는 글입니다."}
      </Notice>
    );
  if (record.status === "failed" || !record.content)
    return (
      <Notice icon={TriangleAlert} title="AI 원문 해설을 만들지 못했습니다">
        {record.error === "FETCH_FAILED"
          ? "원문을 가져오지 못했습니다(PDF·접속 오류 등). 다음 수집 때 다시 시도합니다."
          : "만든 해설이 원문 대조 검사(숫자·형식)를 통과하지 못해 저장하지 않았습니다. 다음 수집 때 다시 시도합니다."}
      </Notice>
    );

  const d = record.content;
  const minutes = record.sourceChars ? Math.max(1, Math.round(record.sourceChars / 1000)) : null;
  return (
    <section aria-labelledby="deep-title" className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="banner border-b border-line px-5 py-5 md:px-6">
        <div className="banner-grid" aria-hidden />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="deep-title" className="flex items-center gap-2 text-[17px] font-bold">
            <BookOpenText className="size-5 text-accent-fg" aria-hidden />
            AI 원문 해설
          </h2>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 text-[12.5px] font-semibold text-fg-2 backdrop-blur" title="AI가 판단한 글의 수준">
            <GraduationCap className="size-3.5" aria-hidden />
            {d.level}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-muted">
          {record.isDemo ? "데모 예시 · AI 생성 아님" : <>원문{minutes ? ` 약 ${minutes}분 분량` : ""}을 읽고 작성 · <LocalTime iso={record.updatedAt} /></>}
        </p>
        <p className="mt-4 text-[16.5px] leading-[1.85] text-fg">{d.overview}</p>
        {d.prerequisites.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[13px]">
            <span className="mr-1 text-muted">먼저 알면 좋은 것</span>
            {d.prerequisites.map((p) => (
              <span key={p} className="rounded-full bg-elevated px-2.5 py-1 text-fg-2">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-8 px-5 py-6 md:px-6">
        {d.keyConcepts.length > 0 && (
          <div>
            <Heading icon={Lightbulb}>핵심 개념</Heading>
            <ul className="grid gap-3 sm:grid-cols-2">
              {d.keyConcepts.map((k, i) => (
                <li key={k.term} className="rise lift rounded-xl border border-line bg-bg/40 p-4" style={{ "--i": i } as React.CSSProperties}>
                  <p className="font-semibold text-fg">{k.term}</p>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-fg-2">{k.explanation}</p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">용어 풀이는 이해를 돕는 일반적인 설명입니다.</p>
          </div>
        )}

        <div>
          <Heading icon={ListOrdered}>주요 내용</Heading>
          <ol className="relative space-y-5 border-l border-line pl-6">
            {d.sections.map((s, i) => (
              <li key={s.heading} className="rise relative" style={{ "--i": i } as React.CSSProperties}>
                <span className="absolute -left-[37px] top-0 grid size-6 place-items-center rounded-full border border-line bg-surface font-mono text-[12px] font-semibold text-accent-fg">
                  {i + 1}
                </span>
                <p className="font-semibold text-fg">{s.heading}</p>
                <p className="mt-1 whitespace-pre-line text-[15px] leading-[1.8] text-fg-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>

        {d.practical.length > 0 && (
          <div>
            <Heading icon={Wrench}>바로 써먹기 · 원문의 적용 방법</Heading>
            <ul className="space-y-2">
              {d.practical.map((p) => (
                <li key={p} className="flex gap-2.5 text-[15px] leading-relaxed text-fg-2">
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" aria-hidden />
                  <span className="whitespace-pre-line">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {d.quotes.length > 0 && (
          <div>
            <Heading icon={Quote}>원문 근거</Heading>
            <div className="space-y-3">
              {d.quotes.map((q) => (
                <blockquote key={q.original} className="rounded-r-lg border-l-2 border-accent bg-elevated/50 px-4 py-3">
                  <p className="text-[14px] leading-relaxed text-muted" lang="en">
                    &ldquo;{q.original}&rdquo;
                  </p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-fg-2">{q.ko}</p>
                </blockquote>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">인용문은 원문 본문에 그대로 있는지 자동으로 확인한 문장만 남깁니다.</p>
          </div>
        )}

        {d.limitations && (
          <div>
            <Heading icon={TriangleAlert}>원문이 다루지 않은 것 · 주의</Heading>
            <p className="text-[15px] leading-relaxed text-fg-2">{d.limitations}</p>
          </div>
        )}

        <p className="flex items-start gap-2 rounded-lg bg-elevated px-3 py-2.5 text-[13px] leading-relaxed text-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          AI가 원문 본문을 읽고 학습용으로 풀어 쓴 해설입니다. 개요·주요 내용의 숫자는 원문과 자동 대조했지만, 내용의 사실 여부를 검증한 것은 아닙니다. 중요한 결정 전에는 원문을 확인하세요.
        </p>
      </div>
    </section>
  );
}

import { AlertTriangle, ChevronDown, CircleDashed, CircleSlash, Info, Lightbulb, ListChecks, Sparkles, Wrench } from "lucide-react";
import type { Article } from "@/types";
import { hasEnoughContent } from "@/lib/ai/schema";
import { LocalTime } from "@/components/ui/local-time";

function StatusNotice({ icon: Icon, tone, title, children }: { icon: typeof Info; tone: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${tone}`}>
          <Icon className="size-[18px]" aria-hidden />
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <div className="mt-1 text-sm leading-relaxed text-muted">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Block({ icon: Icon, title, children }: { icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-fg">
        <Icon className="size-4 text-muted" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** 요약 상태(완료/대기/실패/없음)를 명확히 구분해 보여 준다. 완료가 아니면 요약 내용을 만들어 보여 주지 않는다. */
export function SummaryPanel({ article: a }: { article: Article }) {
  const demo = a.source.kind === "demo";

  if (a.summaryStatus === "pending")
    return (
      <StatusNotice icon={CircleDashed} tone="bg-elevated text-muted" title="한국어 요약 대기 중">
        {hasEnoughContent(a.excerpt, a.title)
          ? `아직 요약이 생성되지 않았습니다. 다음 요약 배치에서 아래 원문 발췌(${a.excerpt!.trim().length}자)를 근거로 한국어 요약을 만듭니다. 그전까지는 발췌와 원문 링크만 표시합니다.`
          : `원문 발췌가 짧거나 구체적인 내용이 적어 요약 근거가 부족합니다. 제목·발췌 번역만 제공하며, 근거 없이 요약을 만들지 않습니다.`}
      </StatusNotice>
    );
  if (a.summaryStatus === "failed")
    return (
      <StatusNotice icon={AlertTriangle} tone="bg-danger-soft text-danger" title="요약 생성 실패">
        재시도 후에도 형식·원문 대조 검사를 통과하는 요약을 만들지 못해 저장하지 않았습니다. 제목·발췌 번역과 원문 링크로 내용을 확인해 주세요.
      </StatusNotice>
    );
  if (a.summaryStatus === "skipped" || !a.summaryKo)
    return (
      <StatusNotice icon={CircleSlash} tone="bg-elevated text-muted" title="요약 없음">
        요약의 근거가 될 원문 정보(발췌·설명)가 부족하거나 요약 대상에서 제외된 글입니다. 근거 없이 요약을 만들지 않습니다.
      </StatusNotice>
    );

  const detailLabels = [a.keyPoints.length > 0 && "기술 포인트", a.useCases.length > 0 && "활용 아이디어", a.caveats && "주의점"].filter(Boolean) as string[];
  const hasDetails = detailLabels.length > 0;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="size-[18px] text-accent-fg" aria-hidden />
          핵심 요약
        </h2>
        {a.summarizedAt && (
          <span className="text-xs text-muted">
            {demo ? "예시 작성" : "AI 생성"} <LocalTime iso={a.summarizedAt} />
          </span>
        )}
      </div>
      {demo ? (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[13px] text-warning">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          데모용 예시 텍스트입니다. AI가 실제 기사를 분석한 결과가 아닙니다.
        </p>
      ) : (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-elevated px-3 py-2 text-[13px] text-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          AI가 출처의 제목·발췌·공개 설명만을 근거로 작성했고, 숫자·불확실 표현이 원문과 맞는지 자동 대조했습니다. 원문 전체를 읽거나 사실을 검증한 결과는 아니므로 중요한 내용은 원문에서 확인하세요.
        </p>
      )}

      <p className="text-[16px] leading-[1.8] text-fg">{a.summaryKo}</p>
      {a.whyItMatters && (
        <p className="mt-4 flex gap-2.5 border-t border-line pt-4 text-[15px] leading-relaxed text-fg-2">
          <Lightbulb className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
          <span>
            <span className="font-semibold text-fg">개발자에게 중요한 이유 </span>
            {a.whyItMatters}
          </span>
        </p>
      )}

      {hasDetails && (
        <details className="group mt-5 border-t border-line pt-4">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-1.5 text-[14px] font-semibold text-fg-2 hover:text-fg md:h-9">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            <span className="group-open:hidden">자세히 보기</span>
            <span className="hidden group-open:inline">접기</span>
            <span className="font-normal text-muted">· {detailLabels.join(" · ")}</span>
          </summary>
          <div className="mt-3 space-y-5">
            {a.keyPoints.length > 0 && (
              <Block icon={ListChecks} title="주요 기술 포인트">
                <ul className="space-y-2">
                  {a.keyPoints.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[15px] leading-relaxed text-fg-2">
                      <span className="mt-[11px] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              </Block>
            )}
            {a.useCases.length > 0 && (
              <Block icon={Wrench} title="활용 아이디어 · AI 제안">
                <p className="mb-2 text-[13px] text-muted">원문 내용이 아니라 AI가 제안한 예시입니다.</p>
                <ul className="space-y-1.5">
                  {a.useCases.map((u) => (
                    <li key={u} className="text-[15px] leading-relaxed text-fg-2">
                      — {u}
                    </li>
                  ))}
                </ul>
              </Block>
            )}
            {a.caveats && (
              <Block icon={AlertTriangle} title="적용 시 주의 · 요약 근거의 한계">
                <p className="text-[15px] leading-relaxed text-fg-2">{a.caveats}</p>
              </Block>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

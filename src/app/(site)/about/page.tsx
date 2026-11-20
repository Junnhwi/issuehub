import { Bot, Clock, Database, Flame, Mail, ShieldCheck, Users, PenLine } from "lucide-react";
import { BUZZ_RULES } from "@/lib/buzz";
import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { getDataMode } from "@/lib/env";
import { TierBadge } from "@/components/articles/badges";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "서비스 소개" };

function Section({ id, icon: Icon, title, children }: { id?: string; icon: typeof Bot; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5 md:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Icon className="size-5 text-accent-fg" aria-hidden />
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-fg-2">{children}</div>
    </section>
  );
}

export default async function AboutPage() {
  const sources = await getData().listSources();
  const mode = getDataMode();
  return (
    <div className="mx-auto max-w-[860px]">
      <PageHeader
        eyebrow="About"
        title="IssueHub는 무엇인가요"
        description="한국어를 쓰는 개발자가 개발 트렌드를 빠르게 훑고, 원문으로 정확히 확인할 수 있도록 돕는 정보 허브입니다."
      />
      <div className="space-y-4">
        <Section icon={Bot} title="서비스 목적">
          <p>
            AI·LLM, Claude Skills, MCP·에이전트, 오픈소스, 프론트엔드·백엔드, 게임 개발 분야의 새 소식과 주목할 저장소를 한곳에 모읍니다.
            IssueHub는 원문을 대신하지 않습니다. 무엇이 나왔는지 빠르게 파악하고, 중요한 내용은 원문에서 확인하도록 안내하는 것이 목표입니다.
          </p>
        </Section>

        <Section id="data" icon={Database} title="데이터 소스와 수집 주기">
          <p>
            현재 데이터 모드: <strong className="font-semibold text-fg">{mode === "demo" ? "데모 데이터 (가상의 예시)" : "실데이터 (Supabase)"}</strong>
          </p>
          <ul className="space-y-2">
            <li>
              <strong className="text-fg">GitHub REST API (저장소 검색)</strong> — 토픽별 활발한 저장소의 공개 메타데이터와 Star 수. Star 수는 매일 스냅샷으로 기록해 증가량을 계산합니다.
            </li>
            <li>
              <strong className="text-fg">Hacker News 공개 API</strong> — 상위 글의 제목·링크·점수. 연결된 페이지의 공개 설명(meta description)만 참고합니다.
            </li>
            <li>
              <strong className="text-fg">공식 RSS 피드</strong> — 실제 제공되는 피드만 등록합니다. RSS가 없는 사이트는 크롤링하지 않습니다.
            </li>
          </ul>
          <p className="flex items-start gap-2">
            <Clock className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
            매시 20분에 GitHub Actions로 수집합니다(Supabase 예약 작업이 실행을 요청). 한 번 실패해도 다음 수집에서 이어서 모읍니다. 화면의 시각은 브라우저의 로컬 시간대로 표시되며, 기사 게시 시각과 IssueHub 수집 시각을 구분해 보여 줍니다.
          </p>
          {mode === "demo" && (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
              데모 모드에서는 외부 API를 호출하지 않습니다. 실데이터로 전환하려면 README의 “실데이터 모드” 절차에 따라 Supabase와 환경 변수를 설정하세요.
            </p>
          )}
          <div>
            <p className="mb-2 text-sm font-medium text-muted">현재 활성 출처</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {sources.map((s) => (
                <li key={s.slug} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate">
                    {s.homepageUrl ? (
                      <a href={s.homepageUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent-fg hover:underline">
                        {s.name}
                      </a>
                    ) : (
                      s.name
                    )}
                  </span>
                  <TierBadge tier={s.tier} />
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section icon={ShieldCheck} title="출처 유형의 의미">
          <p>출처 유형은 “누가 쓴 글인가”를 나타낼 뿐, 내용의 정확성이나 신뢰도 점수가 아닙니다. IssueHub는 숫자로 된 신뢰도 점수를 매기지 않습니다.</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-1 size-4 shrink-0 text-success" aria-hidden />
              <span><strong className="text-fg">공식 출처</strong> — 제품·프로젝트를 만든 조직의 블로그, 공식 API</span>
            </li>
            <li className="flex items-start gap-2">
              <Users className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
              <span><strong className="text-fg">커뮤니티</strong> — 개발자 커뮤니티의 공유·토론 (예: Hacker News)</span>
            </li>
            <li className="flex items-start gap-2">
              <PenLine className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
              <span><strong className="text-fg">개인·독립</strong> — 개인 기술 블로그와 독립 매체</span>
            </li>
          </ul>
          <p>인기 지표(예: HN 점수)와 출처 유형은 서로 다른 개념이며 따로 표시합니다.</p>
        </Section>

        <Section id="buzz" icon={Flame} title="화제도와 반응 수치">
          <p>
            이슈가 얼마나 주목받는지는 출처가 공개한 숫자만으로 보여 줍니다. 지금은 Hacker News의 <strong className="text-fg">점수(추천 수)</strong>와{" "}
            <strong className="text-fg">댓글 수</strong>, GitHub 저장소의 <strong className="text-fg">Star 수와 관측 증가량</strong>이 그 숫자입니다.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-fg">큰 화제</strong> — HN 점수 {BUZZ_RULES.hot.points}점 이상 또는 댓글 {BUZZ_RULES.hot.comments}개 이상
            </li>
            <li>
              <strong className="text-fg">화제</strong> — HN 점수 {BUZZ_RULES.rising.points}점 이상 또는 댓글 {BUZZ_RULES.rising.comments}개 이상
            </li>
            <li>수치는 IssueHub가 마지막으로 수집한 시점의 값입니다. 글이 HN 첫 화면에 있는 동안 매 수집마다 갱신됩니다.</li>
            <li>공식 블로그 등 RSS 출처는 조회수나 평가를 공개하지 않아 반응 수치가 없습니다. 임의의 점수로 채우지 않습니다.</li>
          </ul>
        </Section>

        <Section icon={Bot} title="AI 요약의 한계">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>번역과 요약은 수집 서버에서만 Google Gemini(기본, 무료 티어) 또는 Anthropic API로 만들며, 출처가 제공한 제목·발췌·공개 설명만을 근거로 합니다. 원문 전체를 읽은 결과가 아닙니다.</li>
            <li>제목과 발췌는 한국어로 번역해 보여 주고, 발췌가 짧으면 번역만 하고 요약은 만들지 않습니다. 상세 페이지에서 원문 발췌를 함께 확인할 수 있습니다.</li>
            <li>원문에 없는 사실·기능·수치를 추가하지 않도록 지시하고, 결과 형식을 검증한 뒤에만 저장합니다.</li>
            <li>근거가 부족하면 “요약 없음”, 생성에 실패하면 “요약 실패”, 아직 처리 전이면 “요약 대기”로 표시합니다. 이 경우 요약을 지어내지 않습니다.</li>
            <li>AI 요약은 틀릴 수 있습니다. 의사결정 전에는 반드시 원문을 확인하세요.</li>
          </ul>
        </Section>

        <Section icon={Mail} title="원문 링크와 삭제 요청">
          <p>
            모든 항목은 원문 링크를 함께 제공하며, 본문 전체를 복제·재배포하지 않습니다. 저작권자나 작성자가 목록 노출 중단이나 요약 삭제를 원하면
            프로젝트 저장소의 이슈 트래커로 해당 URL과 함께 요청해 주세요. 확인 후 해당 항목을 삭제합니다.
          </p>
        </Section>
      </div>
    </div>
  );
}

import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getData } from "@/lib/data";
import { formatCount } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "토픽" };

export default async function TopicsPage() {
  const topics = await getData().listTopics();
  return (
    <div className="max-w-[920px]">
      <PageHeader title="토픽" description="관심 분야별로 이슈와 저장소를 모아 봅니다. 토픽은 등록된 키워드를 기준으로 수집할 때 자동으로 분류됩니다." />
      <ul className="divide-y divide-line border-y border-line">
        {topics.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/topics/${t.slug}`}
              className="group grid items-center gap-x-6 gap-y-1 py-5 transition-colors sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-2 sm:hover:bg-hover/50"
            >
              <span className="min-w-0">
                <span className="block text-[17px] font-semibold">
                  <span className="mr-1 text-muted">#</span>
                  {t.nameKo}
                </span>
                <span className="mt-1 block text-[14.5px] text-muted">{t.description}</span>
              </span>
              <span className="tabular flex gap-5 font-mono text-[13px] text-fg-2">
                <span>
                  <span className="mr-1.5 font-sans text-muted">이슈</span>
                  {formatCount(t.articleCount)}
                </span>
                <span>
                  <span className="mr-1.5 font-sans text-muted">저장소</span>
                  {formatCount(t.repoCount)}
                </span>
              </span>
              <ArrowRight className="hidden size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-fg sm:block" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

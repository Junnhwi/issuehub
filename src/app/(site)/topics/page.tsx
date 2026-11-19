import { Hash } from "lucide-react";
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
    <div>
      <PageHeader title="토픽" description="관심 분야별로 이슈와 저장소를 모아 봅니다. 토픽은 등록된 키워드를 기준으로 수집 시 자동 분류됩니다." />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {topics.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/topics/${t.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
            >
              <div className="mb-3 grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-fg">
                <Hash className="size-5" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold">{t.nameKo}</h2>
              <p className="mt-1 flex-1 text-sm text-muted">{t.description}</p>
              <p className="tabular mt-4 flex gap-4 text-[13px] text-fg-2">
                <span>이슈 {formatCount(t.articleCount)}</span>
                <span>저장소 {formatCount(t.repoCount)}</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SavedView } from "./saved-view";

export const metadata: Metadata = { title: "저장한 항목" };

export default function SavedPage() {
  return (
    <div>
      <PageHeader title="저장한 항목" description="북마크한 기사와 저장소를 모아 봅니다." />
      <SavedView />
    </div>
  );
}

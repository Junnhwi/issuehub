/** 페이지를 옮길 때마다 본문이 부드럽게 나타난다(CSS 애니메이션만, 레이아웃은 그대로) */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}

import { Bookmark, Compass, GitFork, Hash, Info, LayoutDashboard, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/github", label: "GitHub", icon: GitFork },
  { href: "/topics", label: "Topics", icon: Hash },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/about", label: "About", icon: Info },
];

export const TIER_LABEL: Record<string, string> = {
  official: "공식 출처",
  community: "커뮤니티",
  independent: "개인·독립",
};

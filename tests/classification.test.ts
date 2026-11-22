import { describe, expect, it } from "vitest";
import { tagTopics } from "@/lib/ingestion/normalize";
import { articleKind } from "@/lib/article-kind";
import { groupSameEvent, isSameEvent } from "@/lib/same-event";

describe("토픽 분류 정밀도(실제 수집 제목 기반)", () => {
  it.each([
    ["FBI Criminal Database Hacked", []],
    ["International UN talks on controlling use of autonomous weapons collapse", []],
    ["An FBI agent called a Claude user about his chats", ["ai-llm"]],
    ["Don't Play Anthropic's Game", ["ai-llm"]],
    ["Microsoft announces Windows Server 2028 with hardened security", []],
  ])("범용 단어 하나로는 태깅하지 않음: %s", (title, expected) => {
    expect(tagTopics(title as string).sort()).toEqual(expected);
  });

  it.each([
    ["Fast-Anything: Don't rewrite it in Rust.", "backend"],
    ["Apple is building an AI agent", "mcp-agents"],
    ["AI may have solved the most important problem in mathematics", "ai-llm"],
    ["Epic Games Turns to AI Coding for the Unreal Engine", "game-dev"],
    ["Aviator: HubSpot's Agent Harness", "mcp-agents"],
    ["PostgreSQL 19: A hands-on tour with runnable browser examples", "backend"],
  ])("구체적 단어는 태깅: %s → %s", (title, slug) => {
    expect(tagTopics(title)).toContain(slug);
  });

  it("본문의 범용 단어 2개(0.5점씩)만으로는 태깅하지 않음", () => {
    expect(tagTopics("Weekly notes", "The server and the database were slow")).toEqual([]);
  });
  it("본문의 강한 단어는 태깅", () => {
    expect(tagTopics("Weekly notes", "We migrated to Postgres")).toEqual(["backend"]);
  });
});

describe("기사 성격", () => {
  it.each([
    ["How Cloudflare WAF protects against ruby2shell (CVE-2026-132825)", "https://blog.cloudflare.com/x", "security"],
    ["Language Models Can Rewrite Their Own Weights", "https://arxiv.org/abs/1", "research"],
    ["Show HN: A tiny tool", "https://example.com", "tool"],
    ["Fast-Anything", "https://github.com/a/b", "tool"],
    ["PostgreSQL 19 Released", "https://postgresql.org/x", "release"],
    ["Next.js 16.2", "https://nextjs.org/blog/next-16-2", "release"],
    ["How to Bypass Rust's Orphan Rule", "https://example.com", "guide"],
    ["Apple is building an AI agent", "https://example.com", "news"],
  ])("%s → %s", (title, url, kind) => expect(articleKind(title, url)).toBe(kind));
});

describe("같은 사건 묶기", () => {
  const t = "2026-11-20T00:00:00Z";
  it("다른 출처의 같은 사건은 묶는다", () => {
    expect(isSameEvent({ title: "FBI's criminal information database hacked, CNN reports", url: "https://cnn.com/a", time: t }, { title: "FBI Criminal Database Hacked", url: "https://theverge.com/b", time: t })).toBe(true);
  });
  it("버전·CVE가 다르면 묶지 않는다", () => {
    expect(isSameEvent({ title: "Next.js 16.2: AI Improvements", url: "https://a.com", time: t }, { title: "Next.js 16.3: AI Improvements", url: "https://b.com", time: t })).toBe(false);
    expect(isSameEvent({ title: "WAF protects against ruby2shell (CVE-2026-1)", url: "https://a.com", time: t }, { title: "WAF protects against Java4Shell (CVE-2026-2)", url: "https://b.com", time: t })).toBe(false);
  });
  it("같은 도메인의 연재 글, 72시간 넘게 떨어진 글은 묶지 않는다", () => {
    expect(isSameEvent({ title: "FBI Criminal Database Hacked", url: "https://cnn.com/a", time: t }, { title: "FBI criminal database hacked again", url: "https://cnn.com/b", time: t })).toBe(false);
    expect(isSameEvent({ title: "FBI Criminal Database Hacked", url: "https://a.com", time: t }, { title: "FBI Criminal Database Hacked", url: "https://b.com", time: "2026-11-25T00:00:00Z" })).toBe(false);
  });
  it("주제만 비슷한 글은 묶지 않는다", () => {
    expect(isSameEvent({ title: "PostgreSQL Extensions in Go", url: "https://a.com", time: t }, { title: "PostgreSQL 19", url: "https://b.com", time: t })).toBe(false);
  });
  it("groupSameEvent는 순서를 지키고 기사를 버리지 않는다", () => {
    const a = (id: string, title: string, url: string) => ({ id, title, originalUrl: url, publishedAt: t, fetchedAt: t });
    const groups = groupSameEvent([a("1", "FBI Criminal Database Hacked", "https://x.com"), a("2", "Rust 2.0", "https://y.com"), a("3", "FBI's criminal information database hacked, CNN reports", "https://cnn.com")]);
    expect(groups.map((g) => [g.item.id, g.related.map((r) => r.id)])).toEqual([["1", ["3"]], ["2", []]]);
  });
});

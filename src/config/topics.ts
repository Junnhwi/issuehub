import type { Topic } from "@/types";

/** 초기 토픽 seed. keywords는 수집 시 자동 태깅과 연관도 계산에 쓰인다(소문자). */
export const TOPICS: Topic[] = [
  {
    slug: "ai-llm",
    nameKo: "AI·LLM",
    description: "대규모 언어 모델, 모델 출시, 추론·평가와 AI 활용 사례",
    keywords: ["llm", "gpt", "claude", "anthropic", "openai", "gemini", "llama", "language model", "transformer", "inference", "fine-tun", "rag ", "embedding", "ai "],
  },
  {
    slug: "claude-skills",
    nameKo: "Claude Skills",
    description: "Claude Code, Agent Skills, 프롬프트·워크플로 자동화",
    keywords: ["claude code", "claude-code", "claude skill", "claude-skills", "agent skill", "agent-skills", "skill.md"],
  },
  {
    slug: "mcp-agents",
    nameKo: "MCP·Agents",
    description: "Model Context Protocol, 에이전트 프레임워크와 도구 연동",
    keywords: ["mcp", "model context protocol", "agent", "agentic", "tool use", "autonomous"],
  },
  {
    slug: "github-oss",
    nameKo: "GitHub·Open Source",
    description: "오픈소스 프로젝트, GitHub 기능 변화, 커뮤니티와 라이선스",
    keywords: ["github", "open source", "open-source", "oss", "license", "maintainer", "git "],
  },
  {
    slug: "frontend",
    nameKo: "Frontend",
    description: "웹 프론트엔드 프레임워크, 브라우저 플랫폼, CSS와 UI 엔지니어링",
    keywords: ["react", "next.js", "nextjs", "vue", "svelte", "css", "tailwind", "browser", "frontend", "typescript", "javascript", "vite"],
  },
  {
    slug: "backend",
    nameKo: "Backend",
    description: "서버, 데이터베이스, 인프라와 API 설계",
    keywords: ["postgres", "database", "sql", "backend", "api", "kubernetes", "docker", "rust", "golang", " go ", "server", "redis", "supabase"],
  },
  {
    slug: "game-dev",
    nameKo: "Game Dev",
    description: "게임 엔진, 그래픽스, 게임 개발 도구와 사례",
    keywords: ["game", "godot", "unity", "unreal", "webgl", "webgpu", "shader", "gamedev"],
  },
];

export const TOPIC_SLUGS = TOPICS.map((t) => t.slug) as [string, ...string[]];

export function getTopic(slug: string) {
  return TOPICS.find((t) => t.slug === slug) ?? null;
}

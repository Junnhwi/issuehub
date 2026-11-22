import type { Topic } from "@/types";

/**
 * 초기 토픽 seed. 수집 시 자동 태깅과 연관도 계산에 쓰인다(소문자).
 * - keywords: 그 자체로 토픽을 뜻하는 강한 단어(제목이나 발췌에 있으면 태깅)
 * - weakKeywords: 다른 뜻으로도 흔히 쓰이는 범용 단어(agent, database, game…). 혼자서는 태깅하지 않고
 *   제목에 2개 이상이거나 강한 단어와 함께일 때만 점수에 더한다. 규칙은 normalize.ts#topicScores
 * - titleKeywords: 제목에 있을 때만 강한 단어로 본다(본문의 "AI" 한 번으로는 태깅하지 않음)
 * - 단어 시작에서만 일치(접두). 끝에 공백이 있으면 단어 전체 일치("rust "는 rusty와 안 맞음)
 */
export const TOPICS: Topic[] = [
  {
    slug: "ai-llm",
    color: "#2dd4bf",
    nameKo: "AI·LLM",
    description: "대규모 언어 모델, 모델 출시, 추론·평가와 AI 활용 사례",
    keywords: ["llm", "gpt", "chatgpt", "claude", "anthropic", "openai", "gemini", "llama", "mistral", "deepseek", "qwen", "language model", "transformer", "fine-tun", "rag ", "embedding", "machine learning", "ai model", "diffusion model"],
    titleKeywords: ["ai ", "inference"],
    weakKeywords: ["neural", "model "],
  },
  {
    slug: "claude-skills",
    color: "#fb923c",
    nameKo: "Claude Skills",
    description: "Claude Code, Agent Skills, 프롬프트·워크플로 자동화",
    keywords: ["claude code", "claude-code", "claude skill", "claude-skills", "agent skill", "agent-skills", "skill.md"],
  },
  {
    slug: "mcp-agents",
    color: "#60a5fa",
    nameKo: "MCP·Agents",
    description: "Model Context Protocol, 에이전트 프레임워크와 도구 연동",
    keywords: ["mcp", "model context protocol", "agentic", "ai agent", "coding agent", "multi-agent", "agent framework", "agent harness", "agent sdk", "tool use", "tool calling", "function calling"],
    weakKeywords: ["agent", "agents ", "autonomous"],
  },
  {
    slug: "github-oss",
    color: "#a8a29e",
    nameKo: "GitHub·Open Source",
    description: "오픈소스 프로젝트, GitHub 기능 변화, 커뮤니티와 라이선스",
    keywords: ["github", "open source", "open-source", "oss ", "maintainer", "git "],
    weakKeywords: ["license", "licensing", "repository"],
  },
  {
    slug: "frontend",
    color: "#facc15",
    nameKo: "Frontend",
    description: "웹 프론트엔드 프레임워크, 브라우저 플랫폼, CSS와 UI 엔지니어링",
    keywords: ["react ", "react-", "react.js", "next.js", "nextjs", "vue", "svelte", "css", "tailwind", "frontend", "front-end", "typescript", "javascript", "vite", "web component", "html "],
    weakKeywords: ["browser", "chrome", "firefox", "safari", "web "],
  },
  {
    slug: "backend",
    color: "#34d399",
    nameKo: "Backend",
    description: "서버, 데이터베이스, 인프라와 API 설계",
    keywords: ["postgres", "sql ", "sqlite", "mysql", "backend", "back-end", "rest api", "graphql", "kubernetes", "docker", "rust ", "rustc", "golang", "redis", "supabase", "microservice", "nginx"],
    weakKeywords: ["database", "api", "server", "go ", "cloud", "latency"],
  },
  {
    slug: "game-dev",
    color: "#fb7185",
    nameKo: "Game Dev",
    description: "게임 엔진, 그래픽스, 게임 개발 도구와 사례",
    keywords: ["godot", "unity3d", "unity engine", "unreal engine", "webgl", "webgpu", "shader", "gamedev", "game dev", "game engine", "game development", "indie game"],
    weakKeywords: ["game", "unity ", "unreal", "steam ", "graphics"],
  },
];

export const TOPIC_SLUGS = TOPICS.map((t) => t.slug) as [string, ...string[]];

export function getTopic(slug: string) {
  return TOPICS.find((t) => t.slug === slug) ?? null;
}

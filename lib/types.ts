// ===== 消息 =====

export interface TokenUsage {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

export interface Message {
  id?: string
  role: "user" | "assistant"
  content: string
  thinking?: string
  timestamp?: string
  tokens?: TokenUsage
  images?: string[] // preview data URLs for user-uploaded images
}

// ===== 会话 =====

export interface SessionListItem {
  id: string
  title: string
  msgCount: number
}

export interface SessionDetail {
  id: string
  history: Message[]
}

// ===== 设置 =====

export type ThemeMode = "dark" | "light"

export interface Settings {
  api_key: string
  base_url: string
  model: string
  thinking_mode: boolean
  theme: ThemeMode
  qwen_api_key: string
  qwen_base_url: string
  qwen_vl_model: string
}

// ===== 流式响应 (NDJSON: {"t":"...","d":"..."}) =====

export interface StreamChunk {
  t: "text" | "think" | "usage" | "error"
  d: string | Record<string, unknown>
}

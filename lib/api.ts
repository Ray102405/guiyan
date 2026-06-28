import type { Settings, SessionListItem, SessionDetail, StreamChunk, Book, BookChapter, ChapterContent, AU } from "./types"

const API_BASE = "/backend"

// 生成 session id（和服务端一致）
export function generateSessionId(): string {
  return "yanchi_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8)
}

// ===== 流式聊天 (NDJSON) =====

export async function* streamChat(
  sessionId: string,
  content: string,
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, input: content }),
    signal,
  })

  if (!res.ok) {
    const err = await res.text()
    yield { t: "error", d: err }
    return
  }

  const reader = res.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const chunk: StreamChunk = JSON.parse(line)
        yield chunk
      } catch {
        // skip malformed lines
      }
    }
  }
}

// ===== 非流式聊天 =====

export async function sendMessage(
  sessionId: string,
  input: string
): Promise<Response> {
  return fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, input }),
  })
}

// ===== 会话管理 =====

export async function getSessions(): Promise<SessionListItem[]> {
  const res = await fetch(`${API_BASE}/sessions`)
  if (!res.ok) throw new Error("获取会话失败")
  return res.json()
}

export async function getSessionDetail(id: string): Promise<SessionDetail> {
  const res = await fetch(`${API_BASE}/session/${id}`)
  if (!res.ok) throw new Error("获取会话详情失败")
  return res.json()
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`${API_BASE}/session/${id}`, { method: "DELETE" })
}

export async function deleteSessionMessages(sessionId: string, messageIds: string[]): Promise<{ deleted: number }> {
  const res = await fetch(`${API_BASE}/api/session/${sessionId}/messages/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message_ids: messageIds }),
  })
  if (!res.ok) throw new Error("删除消息失败")
  return res.json()
}

export async function restoreSession(id: string, history: { role: string; content: string }[]): Promise<void> {
  await fetch(`${API_BASE}/session/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: id, history }),
  })
}

// ===== 设置 =====

export async function getSettings(): Promise<Settings> {
  const res = await fetch(`${API_BASE}/api/settings`)
  if (!res.ok) throw new Error("获取设置失败")
  return res.json()
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  })
  if (!res.ok) throw new Error("保存设置失败")
  return res.json()
}

// ===== 今日笔记 =====

export async function generateTodayNote(history: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(`${API_BASE}/api/today-note`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history }),
  })
  if (!res.ok) throw new Error("生成今日笔记失败")
  const data = await res.json()
  return data.note || data.content || ""
}

// ===== 首页 =====

export interface HomeData {
  daysTogether: number
  startDate: string
  todayNote: string | null
  hasTodayNote: boolean
  weather: string | null
  weatherCity: string | null
}

export async function getHomeData(): Promise<HomeData> {
  const res = await fetch(`${API_BASE}/api/home`)
  if (!res.ok) throw new Error("获取首页数据失败")
  return res.json()
}

// ===== 书架 =====

export async function getBooks(): Promise<{ books: Book[]; count: number }> {
  const res = await fetch(`${API_BASE}/api/books`)
  if (!res.ok) throw new Error("获取书架失败")
  return res.json()
}

export async function getBook(bookId: string): Promise<Book> {
  const res = await fetch(`${API_BASE}/api/books/${bookId}`)
  if (!res.ok) throw new Error("获取书籍失败")
  return res.json()
}

export async function getChapter(bookId: string, chapterIndex: number): Promise<ChapterContent> {
  const res = await fetch(`${API_BASE}/api/books/${bookId}/chapter/${chapterIndex}`)
  if (!res.ok) throw new Error("获取章节失败")
  return res.json()
}

export async function updateBookProgress(bookId: string, line: number, chapter: number): Promise<void> {
  await fetch(`${API_BASE}/api/books/${bookId}/progress`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ line, chapter }),
  })
}

export async function deleteBook(bookId: string): Promise<void> {
  await fetch(`${API_BASE}/api/books/${bookId}`, { method: "DELETE" })
}

export async function discussBook(
  bookId: string,
  chapterIndex: number,
  message: string,
  history?: { role: string; content: string }[]
): Promise<{ reply: string; thinking?: string }> {
  const res = await fetch(`${API_BASE}/api/books/discuss`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ book_id: bookId, chapter_index: chapterIndex, message, history }),
  })
  if (!res.ok) throw new Error("讨论失败")
  return res.json()
}

export async function* streamDiscussBook(
  bookId: string,
  chapterIndex: number,
  message: string,
  history?: { role: string; content: string }[]
): AsyncGenerator<{ t: string; d: string }> {
  const res = await fetch(`${API_BASE}/api/books/discuss/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ book_id: bookId, chapter_index: chapterIndex, message, history }),
  })
  if (!res.ok) return

  const reader = res.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      if (!line.trim()) continue
      try { yield JSON.parse(line) } catch {}
    }
  }
}

export async function getDiscussionHistory(
  bookId: string,
  chapterIndex: number
): Promise<{ messages: { role: string; content: string }[] }> {
  const res = await fetch(`${API_BASE}/api/books/${bookId}/discussions/${chapterIndex}`)
  if (!res.ok) return { messages: [] }
  return res.json()
}

// ===== Token 用量 =====

export interface DailyTokenUsage {
  date: string
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
  total: number
}

export async function getTodayTokenUsage(): Promise<DailyTokenUsage> {
  const res = await fetch(`${API_BASE}/api/token-usage/today`)
  if (!res.ok) throw new Error("获取 token 用量失败")
  return res.json()
}

export interface TodayStatus {
  date: string
  note: string | null
  hasNote: boolean
  sessions: number
  messages: number
  pendingMemories: number
  confirmedMemories: number
  tokens: number
}

export async function getTodayStatus(): Promise<TodayStatus> {
  const res = await fetch(`${API_BASE}/api/today-status`)
  if (!res.ok) throw new Error("获取今日状态失败")
  return res.json()
}

// ===== 今日心情 =====

export interface MoodData {
  date: string
  mood: string | null
  emoji: string | null
  label: string | null
}

export const MOOD_OPTIONS = [
  { mood: "happy", emoji: "😊", label: "开心" },
  { mood: "calm", emoji: "😌", label: "平静" },
  { mood: "sweet", emoji: "🥰", label: "甜蜜" },
  { mood: "okay", emoji: "😐", label: "一般" },
  { mood: "sad", emoji: "😢", label: "难过" },
  { mood: "annoyed", emoji: "😤", label: "烦躁" },
  { mood: "tired", emoji: "😴", label: "累" },
  { mood: "nice", emoji: "✨", label: "还不错" },
]

export async function getMood(): Promise<MoodData> {
  const res = await fetch(`${API_BASE}/api/mood`)
  if (!res.ok) throw new Error("获取心情失败")
  return res.json()
}

export async function setMood(mood: string, emoji: string, label: string): Promise<MoodData> {
  const res = await fetch(`${API_BASE}/api/mood`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mood, emoji, label }),
  })
  if (!res.ok) throw new Error("设置心情失败")
  return res.json()
}

// ===== AU（平行宇宙） =====

export interface AUListResponse {
  aus: AU[]
}

export async function getAuList(): Promise<AUListResponse> {
  const res = await fetch(`${API_BASE}/api/au`)
  if (!res.ok) throw new Error("获取 AU 列表失败")
  return res.json()
}

export async function createAu(data: { name: string; background?: string; persona_override?: string; tone_shift?: string }): Promise<AU> {
  const res = await fetch(`${API_BASE}/api/au`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("创建 AU 失败")
  return res.json()
}

export async function activateAu(auId: string): Promise<AU> {
  const res = await fetch(`${API_BASE}/api/au/${auId}/activate`, {
    method: "PUT",
  })
  if (!res.ok) throw new Error("激活 AU 失败")
  return res.json()
}

export async function deleteAu(auId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/au/${auId}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("删除 AU 失败")
}

// ===== 笔记 =====

export interface NoteItem {
  id: string
  date: string
  preview: string
  label?: string
  highlighted?: boolean
}

export interface NotesListResponse {
  notes: NoteItem[]
}

export async function getNotesList(): Promise<NotesListResponse> {
  const res = await fetch(`${API_BASE}/api/notes`)
  if (!res.ok) throw new Error("获取笔记列表失败")
  return res.json()
}

export async function getNoteContent(date: string): Promise<{ date: string; content: string }> {
  const res = await fetch(`${API_BASE}/api/notes/${date}`)
  if (!res.ok) throw new Error("获取笔记内容失败")
  return res.json()
}

// ===== 时间线 =====

export async function getTimeline(): Promise<{ items: { id: string; title: string; content: string; date: string; type: string }[] }> {
  const res = await fetch(`${API_BASE}/api/timeline`)
  if (!res.ok) throw new Error("获取时间线失败")
  return res.json()
}

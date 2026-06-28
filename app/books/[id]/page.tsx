"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ChevronLeft, ChevronRight, MessageCircle, X,
  ChevronDown, Heart, Send, Sparkles
} from "lucide-react"
import { getBook, getChapter, updateBookProgress, streamDiscussBook, getDiscussionHistory } from "@/lib/api"
import type { Book, ChapterContent } from "@/lib/types"
import { toast } from "sonner"

const BACKEND = "/backend"

interface ChatMsg {
  role: "user" | "assistant" | "system"
  content: string
}

export default function ReaderPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params.id as string

  const [book, setBook] = useState<Book | null>(null)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [chapterContent, setChapterContent] = useState<ChapterContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const visitedChaptersRef = useRef<Set<number>>(new Set())

  // 聊天相关
  const [chatOpen, setChatOpen] = useState(false)
  const chatOpenRef = useRef(false)
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatStreaming, setChatStreaming] = useState(false)
  const [chatStreamContent, setChatStreamContent] = useState("")
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // 加载书籍
  useEffect(() => {
    if (!bookId) return
    loadBook()
  }, [bookId])

  async function loadBook() {
    try {
      const b = await getBook(bookId)
      setBook(b)
      // 从上次读到的地方继续
      const startChapter = b.currentChapter || 0
      setChapterIndex(startChapter)
      loadChapter(startChapter)
    } catch {
      toast.error("加载书籍失败")
      router.push("/books")
    } finally {
      setLoading(false)
    }
  }

  async function loadChapter(idx: number) {
    setContentLoading(true)
    try {
      const ch = await getChapter(bookId, idx)
      setChapterContent(ch)
      // 加载当前章节的讨论历史（如果聊天面板开着）
      if (chatOpenRef.current) {
        loadChapterDiscussions(idx)
      }
    } catch {
      toast.error("加载章节失败")
    } finally {
      setContentLoading(false)
    }
  }

  async function loadChapterDiscussions(idx: number, isFirstLoad = false) {
    try {
      const hist = await getDiscussionHistory(bookId, idx)
      if (hist.messages && hist.messages.length > 0) {
        // 用章节分隔线标记历史归属
        const chapter = book?.chapters?.[idx]
        const separator: ChatMsg = {
          role: "system",
          content: `─── 第 ${idx + 1} 章${chapter ? " · " + chapter.title : ""}的讨论 ───`
        }
        const historyMsgs: ChatMsg[] = hist.messages as ChatMsg[]
        setChatMsgs((prev) => {
          // 如果已经加过这个章节的分隔线，不再重复
          if (prev.some((m) => m.role === "system" && m.content === separator.content)) {
            return prev
          }
          if (isFirstLoad) {
            return [separator, ...historyMsgs]
          }
          return [...prev, separator, ...historyMsgs]
        })
      } else if (isFirstLoad) {
        // 首次加载无历史，显示空状态
        setChatMsgs([])
      }
    } catch {
      // 安静失败
    }
  }

  // 翻页（不用 useCallback 避免闭包过期）
  function switchChapter(newIdx: number) {
    if (newIdx === chapterIndex) return
    setChapterIndex(newIdx)
    loadChapter(newIdx)
    saveProgress(newIdx)
    visitedChaptersRef.current.add(newIdx)
  }

  function goPrev() {
    if (chapterIndex > 0) switchChapter(chapterIndex - 1)
  }

  function goNext() {
    if (chapterContent && chapterIndex < chapterContent.totalChapters - 1) {
      switchChapter(chapterIndex + 1)
    }
  }

  function saveProgress(chapter: number) {
    if (!book) return
    const lines = chapterContent?.content.split("\n").length || 0
    updateBookProgress(bookId, lines, chapter).catch(() => {})
  }

  // 聊天滚动到底部
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMsgs, chatStreamContent])

  // 同步 chatOpen ref，避免闭包过期
  useEffect(() => { chatOpenRef.current = chatOpen }, [chatOpen])

  // 提炼记忆：将当前讨论发送到 /remember
  async function handleExtractMemory() {
    if (chatMsgs.length === 0) return
    try {
      toast.loading("提取中...")
      const res = await fetch(`${BACKEND}/remember`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: chatMsgs
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      toast.dismiss()
      if (res.ok) {
        const data = await res.json()
        if (data.processing) {
          toast.success("已提交，提取中 ✧")
        } else if (data.pending) {
          toast.success(`已提取 ${data.count} 条，待审核 ✧`)
        } else {
          toast.success(data.saved ? "记住了 ✧" : "没有新内容")
        }
      } else {
        toast.error("提取失败")
      }
    } catch {
      toast.dismiss()
      toast.error("提取失败")
    }
  }

  // 发送聊天
  async function handleChatSend() {
    const msg = chatInput.trim()
    if (!msg || chatStreaming || !chapterContent) return

    setChatInput("")
    const userMsg: ChatMsg = { role: "user", content: msg }
    setChatMsgs((prev) => [...prev, userMsg])

    setChatStreaming(true)
    setChatStreamContent("")
    let fullReply = ""

    try {
      const history = chatMsgs.map((m) => ({ role: m.role, content: m.content }))
      for await (const chunk of streamDiscussBook(bookId, chapterIndex, msg, history)) {
        if (chunk.t === "text") {
          fullReply += chunk.d
          setChatStreamContent(fullReply)
        }
      }
      if (fullReply) {
        setChatMsgs((prev) => [...prev, { role: "assistant", content: fullReply }])
      }
    } catch {
      toast.error("讨论发送失败")
    } finally {
      setChatStreaming(false)
      setChatStreamContent("")
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#c4a87a] border-t-transparent" />
      </div>
    )
  }

  if (!book) return null

  return (
    <div className="flex h-full flex-col pt-[env(safe-area-inset-top,12px)]">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
        <button
          onClick={() => router.push("/books")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>书架</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
            {book.title}
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            {book.progress > 0 ? `${book.progress}%` : ""}
          </span>
        </div>
        <div className="w-14" />
      </div>

      {/* 章节导航 + 内容 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 scrollbar-thin">
        {/* 章节标题 + 导航按钮 */}
        {chapterContent && (
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={chapterIndex <= 0}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              上一章
            </button>
            <span className="text-xs font-medium text-muted-foreground/70">
              {chapterContent.chapter.title}
            </span>
            <button
              onClick={goNext}
              disabled={!chapterContent || chapterIndex >= chapterContent.totalChapters - 1}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            >
              下一章
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 正文 */}
        <div className="max-w-2xl mx-auto">
          {contentLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-4 w-4 animate-pulse rounded-full bg-[#c4a87a]/30" />
            </div>
          ) : chapterContent ? (
            <div className="space-y-3 leading-relaxed text-foreground/85 text-sm whitespace-pre-wrap font-[system-ui]">
              {chapterContent.content.split("\n").map((line, i) => (
                <p key={i} className={line.trim() === "" ? "h-3" : ""}>
                  {line || ""}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground/50 py-10">
              无法加载章节内容
            </p>
          )}

          {/* 底部占位 */}
          {chapterContent && chapterIndex < chapterContent.totalChapters - 1 && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={goNext}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-5 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
              >
                继续下一章 <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 悬浮聊天按钮 */}
      {!chatOpen && (
        <button
          onClick={() => {
            setChatOpen(true)
            setTimeout(() => loadChapterDiscussions(chapterIndex, true), 100)
          }}
          className="fixed bottom-20 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#c4a87a] text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* 聊天面板 */}
      {chatOpen && (
        <div className="fixed inset-x-0 z-50 flex flex-col border-t border-border/50 glass-nav animate-in slide-in-from-bottom-full"
          style={{ height: "min(400px, 50vh)", bottom: "64px" }}
        >
          {/* 聊天顶栏 */}
          <div className="flex items-center justify-between border-b border-border/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                💬 聊剧情
              </span>
              {chatMsgs.filter((m) => m.role !== "system").length >= 2 && (
                <button
                  onClick={handleExtractMemory}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground/60 hover:text-[#c4a87a] hover:bg-[#c4a87a]/10 transition-colors"
                  title="从讨论中提炼记忆"
                >
                  <Sparkles className="h-3 w-3" />
                  提炼
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {chapterContent && (
                <span className="text-[10px] text-muted-foreground/50">
                  {chapterContent.chapter.title}
                </span>
              )}
              <button
                onClick={() => setChatOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 消息列表 */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin"
          >
            {chatMsgs.length === 0 && !chatStreaming && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Heart className="h-6 w-6 text-muted-foreground/20 mb-2" />
                <p className="text-xs text-muted-foreground/40 max-w-[200px]">
                  对这段剧情有什么想法？和砚迟聊聊吧
                </p>
              </div>
            )}
            {chatMsgs.map((msg, i) => {
              if (msg.role === "system") {
                return (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-border/30" />
                    <span className="text-[10px] text-muted-foreground/40 shrink-0 whitespace-nowrap">{msg.content}</span>
                    <div className="flex-1 h-px bg-border/30" />
                  </div>
                )
              }
              return (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#c4a87a] text-white rounded-br-md"
                        : "bg-card border border-border/50 text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              )
            })}
            {chatStreaming && chatStreamContent && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-card border border-border/50 px-3.5 py-2 text-sm leading-relaxed text-foreground">
                  {chatStreamContent}
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-[#c4a87a]/60 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* 输入栏 */}
          <div className="border-t border-border/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleChatSend()
                  }
                }}
                placeholder="聊聊这段剧情..."
                className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-ring focus:outline-none"
                disabled={chatStreaming}
              />
              <button
                onClick={handleChatSend}
                disabled={!chatInput.trim() || chatStreaming}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c4a87a] text-white transition-all hover:bg-[#b8996a] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

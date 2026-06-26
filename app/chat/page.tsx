"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, MessageCircle, Trash2, ChevronLeft, ChevronDown, Bookmark, PenSquare, Download } from "lucide-react"
import { Message } from "@/components/chat/message"
import { InputBar } from "@/components/chat/input-bar"
import type { AttachedFile } from "@/components/chat/input-bar"
import { streamChat, getSessions, getSessionDetail, deleteSession, generateSessionId, restoreSession } from "@/lib/api"
import type { Message as MessageType, SessionListItem } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format, isSameDay } from "date-fns"
import { toast } from "sonner"

const SESSION_LIST_KEY = "guiyan_sessions"

function loadSessionIds(): SessionListItem[] {
  try {
    const raw = localStorage.getItem(SESSION_LIST_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSessionIds(list: SessionListItem[]) {
  localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(list))
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<SessionListItem[]>(loadSessionIds)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageType[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [streamingThinking, setStreamingThinking] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)
  const streamingRef = useRef("")      // 避免闭包陷阱
  const thinkingRef = useRef("")
  const lastSuggestRef = useRef(0)
  const suggestTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const msgCountRef = useRef(0)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, streamingContent])

  // 检测是否需要显示"回到底部"按钮
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBtn(dist > 200)
  }, [])

  // 初始化
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    initSessions()
  }, [])

  // 切换 currentId 时加载消息
  useEffect(() => {
    if (!currentId) { setMessages([]); return }
    loadSessionMessages(currentId)
  }, [currentId])

  async function initSessions() {
    try {
      const remote = await getSessions()
      const local = loadSessionIds()
      const seen = new Set<string>()
      const merged: SessionListItem[] = []
      for (const s of [...remote, ...local]) {
        if (!seen.has(s.id)) { seen.add(s.id); merged.push(s) }
      }
      setSessions(merged)
      saveSessionIds(merged)
    } catch {
      // 离线也可用
    } finally {
      setLoading(false)
    }
  }

  async function loadSessionMessages(sid: string) {
    try {
      const detail = await getSessionDetail(sid)
      setMessages(detail.history || [])
    } catch {
      setMessages([])
    }
  }

  function handleNewSession() {
    const sid = generateSessionId()
    const entry: SessionListItem = { id: sid, title: "新对话", msgCount: 0 }
    setCurrentId(sid)
    setMessages([])
    setSidebarOpen(false)
    setSessions((prev) => {
      const next = [entry, ...prev]
      saveSessionIds(next)
      return next
    })
  }

  async function handleDeleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    try { await deleteSession(id) } catch {}
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id)
      saveSessionIds(next)
      return next
    })
    if (currentId === id) { setCurrentId(null); setMessages([]) }
    toast.success("已删除")
  }

  function handleSwitchSession(sid: string) {
    setCurrentId(sid)
    setSidebarOpen(false)
  }

  function formatDateLabel(id: string) {
    const parts = id.split("_")
    if (parts.length >= 2 && parts[1]) {
      const ts = parseInt(parts[1], 36)
      if (!isNaN(ts)) {
        const d = new Date(ts)
        const now = new Date()
        if (isSameDay(d, now)) return "今天"
        const y = new Date(now); y.setDate(y.getDate() - 1)
        if (isSameDay(d, y)) return "昨天"
        return format(d, "M/d")
      }
    }
    return ""
  }

  // 生成消息中的日期分隔线
  function getDateDividers(msgs: MessageType[]): Set<number> {
    const dividers = new Set<number>()
    if (msgs.length === 0) return dividers
    dividers.add(0) // 第一条总是显示日期
    for (let i = 1; i < msgs.length; i++) {
      const prev = msgs[i - 1].timestamp
      const curr = msgs[i].timestamp
      if (prev && curr && !isSameDay(new Date(prev), new Date(curr))) {
        dividers.add(i)
      }
    }
    return dividers
  }

  // 删除单条消息
  function handleDeleteMessage(msgId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== msgId))
    toast("消息已删除")
  }

  async function handleSend(content: string, attachedFiles?: AttachedFile[]) {
    let sid = currentId
    if (!sid) {
      sid = generateSessionId()
      setCurrentId(sid)
      const entry: SessionListItem = { id: sid, title: "新对话", msgCount: 0 }
      setSessions((prev) => {
        const next = [entry, ...prev]
        saveSessionIds(next)
        return next
      })
    }

    // 确保后端有这个 session
    try {
      await getSessionDetail(sid)
    } catch {
      await restoreSession(sid, messages.map((m) => ({ role: m.role, content: m.content })))
    }

    // 构建用户消息（含图片预览）
    const imagePreviews = attachedFiles?.filter((f) => f.preview).map((f) => f.preview!) || []
    const userMsg: MessageType = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
      images: imagePreviews.length > 0 ? imagePreviews : undefined,
    }
    setMessages((prev) => [...prev, userMsg])

    // 更新标题
    const titlePrefix = content.slice(0, 40) || (imagePreviews.length > 0 ? "[图片]" : "")
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === sid ? { ...s, title: titlePrefix || s.title, msgCount: (s.msgCount || 0) + 1 } : s
      )
      saveSessionIds(next)
      return next
    })

    startStream(sid, content, attachedFiles)
  }

  async function handleManualRemember() {
    if (messages.length === 0) return
    try {
      toast.loading("记住了...")
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:2612"}/remember`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      toast.dismiss()
      if (res.ok) {
        const data = await res.json()
        toast.success(data.saved ? "记住了 ✧" : "没有新内容")
      } else {
        toast.error("记住失败")
      }
    } catch {
      toast.error("记住失败")
    }
  }

  async function handleWriteNote() {
    if (messages.length === 0) return
    try {
      toast.loading("砚迟在写日记...")
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:2612"}/api/today-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      toast.dismiss()
      if (res.ok) {
        const data = await res.json()
        toast.success(data.saved ? "日记写好了 ✧" : "没有新内容可记")
      } else {
        toast.error("写笔记失败")
      }
    } catch {
      toast.error("写笔记失败")
    }
  }

  function handleExport() {
    if (messages.length === 0) return
    const title = sessions.find((s) => s.id === currentId)?.title || "对话记录"
    const lines = [`# ${title}\n`, `导出时间: ${new Date().toLocaleString("zh-CN")}\n`]
    for (const msg of messages) {
      const role = msg.role === "user" ? "🧑 你" : "🪨 砚迟"
      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString("zh-CN") : ""
      lines.push(`\n---\n### ${role} ${time}\n\n${msg.content}`)
      if (msg.thinking) {
        lines.push(`\n> 💭 ${msg.thinking}`)
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${title.replace(/[/\\?%*:|"<>]/g, "_")}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("已导出")
  }

  async function startStream(sid: string, content: string, files?: AttachedFile[]) {
    setIsStreaming(true)
    setStreamingContent("")
    setStreamingThinking("")
    streamingRef.current = ""
    thinkingRef.current = ""
    abortRef.current = new AbortController()

    // 后端流式调用（含文件附件）
    const body: Record<string, unknown> = { session_id: sid, input: content }
    if (files && files.length > 0) {
      body.files = files.map((f) => ({
        name: f.name,
        type: f.type,
        data: f.data,
      }))
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:2612"}/chat/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        }
      )

      if (!res.ok) {
        const err = await res.text()
        toast.error("请求失败: " + err)
        setIsStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) { setIsStreaming(false); return }

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
            const chunk = JSON.parse(line)
            switch (chunk.t) {
              case "text":
                if (typeof chunk.d === "string") {
                  setStreamingContent((prev) => prev + chunk.d)
                  streamingRef.current += chunk.d
                }
                break
              case "think":
                if (typeof chunk.d === "string") {
                  setStreamingThinking((prev) => prev + chunk.d)
                  thinkingRef.current += chunk.d
                }
                break
              case "usage":
                break
              case "error":
                toast.error(typeof chunk.d === "string" ? chunk.d : "请求出错")
                break
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("请求失败: " + err.message)
      }
    } finally {
      const finalContent = streamingRef.current
      const finalThinking = thinkingRef.current
      if (finalContent) {
        setMessages((prev) => {
          const newMsgs = [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: "assistant" as const,
              content: finalContent,
              thinking: finalThinking,
              timestamp: new Date().toISOString(),
            },
          ]
          // Suggest remember 逻辑
          const userCount = newMsgs.filter((m) => m.role === "user").length
          const roundsSinceLast = userCount - lastSuggestRef.current
          if (userCount >= 3 && roundsSinceLast >= 5 && finalContent.length > 60) {
            if (Math.random() < 0.35) {
              lastSuggestRef.current = userCount
              setTimeout(() => suggestRemember(), 500)
            }
          }
          return newMsgs
        })
      }
      setIsStreaming(false)
      setStreamingContent("")
      setStreamingThinking("")
      streamingRef.current = ""
      thinkingRef.current = ""
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    const finalContent = streamingRef.current
    const finalThinking = thinkingRef.current
    if (finalContent) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: finalContent,
          thinking: finalThinking,
          timestamp: new Date().toISOString(),
        },
      ])
    }
    setIsStreaming(false)
    setStreamingContent("")
    setStreamingThinking("")
    streamingRef.current = ""
    thinkingRef.current = ""
  }

  // 消息计数更新：每当消息变化时更新 ref
  useEffect(() => {
    const userMsgs = messages.filter((m) => m.role === "user").length
    msgCountRef.current = userMsgs
  }, [messages])

  // 建议记忆
  function suggestRemember() {
    setShowSuggest(true)
    clearTimeout(suggestTimerRef.current)
    suggestTimerRef.current = setTimeout(() => setShowSuggest(false), 8000)
  }

  async function handleAcceptRemember() {
    setShowSuggest(false)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:2612"}/remember`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            history: messages.map((m) => ({ role: m.role, content: m.content })),
          }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        toast.success(data.saved ? "记住了 ✧" : "没有新内容")
      }
    } catch {
      toast.error("记忆失败")
    }
  }

  const dividers = getDateDividers(messages)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#c4a87a] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="relative flex h-full">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r transition-transform glass-nav",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">会话</h2>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground/60">暂无会话</div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSwitchSession(session.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                  currentId === session.id && "bg-muted"
                )}
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground">{session.title || "新对话"}</div>
                  <div className="text-[10px] text-muted-foreground/60">{formatDateLabel(session.id)}</div>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  onKeyDown={(e) => e.key === "Enter" && handleDeleteSession(session.id, e as any)}
                  className="shrink-0 cursor-pointer rounded p-1 text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border p-3">
          <button
            onClick={handleNewSession}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#c4a87a]/10 py-2.5 text-sm font-medium text-[#c4a87a] transition-colors hover:bg-[#c4a87a]/20"
          >
            <Plus className="h-4 w-4" /> 新对话
          </button>
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            <span>{sessions.find((s) => s.id === currentId)?.title || "归砚"}</span>
          </button>
          {currentId && messages.length > 0 && (
            <>
              <button
                onClick={handleManualRemember}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-[#c4a87a] hover:bg-[#c4a87a]/10 transition-colors"
                title="记住这段对话"
              >
                <Bookmark className="h-4 w-4" />
              </button>
              <button
                onClick={handleWriteNote}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-[#c4a87a] hover:bg-[#c4a87a]/10 transition-colors"
                title="写今日笔记"
              >
                <PenSquare className="h-4 w-4" />
              </button>
              <button
                onClick={handleExport}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-[#c4a87a] hover:bg-[#c4a87a]/10 transition-colors"
                title="导出对话"
              >
                <Download className="h-4 w-4" />
              </button>
            </>
          )}
          <button onClick={handleNewSession} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative flex-1 overflow-y-auto px-4 py-4 scrollbar-thin"
        >
          {!currentId && messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="text-4xl">🪨</div>
              <p className="text-sm text-muted-foreground/60">和砚迟说说话吧</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={msg.id || i}>
                  {/* Date divider */}
                  {dividers.has(i) && msg.timestamp && (
                    <div className="flex items-center gap-3 py-3">
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-[10px] text-muted-foreground/40 shrink-0">
                        {format(new Date(msg.timestamp), "yyyy年M月d日")}
                      </span>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>
                  )}
                  <Message
                    message={msg}
                    onDelete={handleDeleteMessage}
                  />
                </div>
              ))}
              {(streamingContent || streamingThinking) && (
                <Message
                  message={{
                    id: "streaming",
                    role: "assistant",
                    content: streamingContent,
                    thinking: streamingThinking,
                  }}
                  isStreaming
                />
              )}
            </div>
          )}

          {/* 建议记忆按钮 */}
          {showSuggest && (
            <div className="flex justify-center py-2">
              <button
                onClick={handleAcceptRemember}
                className="animate-in fade-in slide-in-from-bottom-2 rounded-full border border-border/50 bg-card px-4 py-1.5 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-muted"
              >
                ✧ 要记住这一刻吗
              </button>
            </div>
          )}

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="sticky bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-border/50 bg-background/80 backdrop-blur px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-background transition-colors"
            >
              <ChevronDown className="h-3 w-3" /> 回到底部
            </button>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border/50 px-4 py-3">
          <InputBar onSend={handleSend} onStop={handleStop} isStreaming={isStreaming} />
        </div>
      </div>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, MessageCircle, Trash2, Pencil, ChevronLeft, ChevronDown, Sparkle, PenSquare, Download } from "lucide-react"
import { Message } from "@/components/chat/message"
import { InputBar } from "@/components/chat/input-bar"
import type { AttachedFile } from "@/components/chat/input-bar"
import { streamChat, getSessions, getSessionDetail, deleteSession, generateSessionId, restoreSession, deleteSessionMessages, getAuList } from "@/lib/api"
import type { Message as MessageType, SessionListItem, TokenUsage } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format, isSameDay } from "date-fns"
import { toast } from "sonner"

const SESSION_LIST_KEY = "guiyan_sessions"
const BACKEND = "/backend"

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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null) // 待删除的 session ID
  const [renamingId, setRenamingId] = useState<string | null>(null) // 正在重命名的 session ID
  const [renameText, setRenameText] = useState("")
  const [retryMessage, setRetryMessage] = useState<{ content: string; files?: AttachedFile[] } | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const retryCountRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)
  const streamingRef = useRef("")      // 避免闭包陷阱
  const thinkingRef = useRef("")
  const usageRef = useRef<TokenUsage>({}) // token 用量
  const lastSuggestRef = useRef(0)
  const suggestTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const msgCountRef = useRef(0)
  const proactiveSeenRef = useRef<string>("") // 已展示的主动消息 ID
  const [currentAuName, setCurrentAuName] = useState<string | null>(null)

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return
    // 直接设置 scrollTop，不依赖动画帧（避免新内容还没渲染完）
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    // 如果内容还在渲染（流式输出），100ms 后再来一次
    if (isStreaming) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 100)
    }
  }, [isStreaming])

  useEffect(() => { scrollToBottom() }, [messages, streamingContent])

  // 获取当前 AU 名称
  useEffect(() => {
    getAuList().then((data) => {
      const active = data.aus.find((a) => a.active && a.id !== "default")
      setCurrentAuName(active?.name || null)
    }).catch(() => {})
  }, [])

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

  // 砚迟主动消息轮询（每 60 秒检查一次）
  useEffect(() => {
    if (!currentId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND}/api/proactive/check`)
        if (!res.ok) return
        const data = await res.json()

        // 会话列表 auto-refresh（搭 proactive 轮询的车，无变化不重渲染）
        try {
          const sr = await fetch(`${BACKEND}/sessions`)
          if (sr.ok) {
            const remote: SessionListItem[] = await sr.json()
            setSessions(prev => {
              if (prev.length === remote.length &&
                  prev.every((s, i) => s.id === remote[i].id && s.msgCount === remote[i].msgCount))
                return prev
              saveSessionIds(remote)
              return remote
            })
          }
        } catch {}

        if (!data.message) return
        // 避免重复插入同一条
        if (proactiveSeenRef.current === data.message) return
        proactiveSeenRef.current = data.message
        // 通过 Service Worker 发通知（PWA 模式，手机也支持）
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "proactive",
            text: data.message,
          })
        } else if ("Notification" in window && Notification.permission === "granted") {
          // 降级：直接通知
          new Notification("砚迟", { body: data.message, icon: "/icons/icon-192.png?v=2" })
        } else if ("Notification" in window && Notification.permission !== "denied") {
          Notification.requestPermission()
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `proactive-${Date.now()}`,
            role: "assistant",
            content: `✨ ${data.message}`,
            timestamp: new Date().toISOString(),
          },
        ])
        // 保存到当前 session + 标记已读
        if (currentId) {
          fetch(`${BACKEND}/api/proactive/save-to-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: currentId, message: data.message }),
          }).catch(() => {})
        }
        fetch(`${BACKEND}/api/proactive/mark-seen`, { method: "POST" }).catch(() => {})
      } catch { /* 静默失败 */ }
    }, 60000)
    return () => clearInterval(interval)
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

  function handleDeleteClick(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setDeleteConfirm(id)
  }

  async function handleConfirmDelete() {
    if (!deleteConfirm) return
    try { await deleteSession(deleteConfirm) } catch {}
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== deleteConfirm)
      saveSessionIds(next)
      return next
    })
    if (currentId === deleteConfirm) { setCurrentId(null); setMessages([]) }
    setDeleteConfirm(null)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  async function handleBatchDelete() {
    if (selectedIds.length === 0) return
    for (const sid of selectedIds) {
      try { await deleteSession(sid) } catch {}
    }
    setSessions((prev) => {
      const next = prev.filter((s) => !selectedIds.includes(s.id))
      saveSessionIds(next)
      return next
    })
    if (currentId && selectedIds.includes(currentId)) {
      setCurrentId(null)
      setMessages([])
    }
    setSelectedIds([])
    setSelectMode(false)
  }

  function moveSessionToTop(sid: string) {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === sid)
      if (idx <= 0) return prev // 已经在最前
      const item = prev[idx]
      const next = [item, ...prev.filter((s) => s.id !== sid)]
      saveSessionIds(next)
      return next
    })
  }

  function handleStartRename(sid: string, title: string) {
    setRenamingId(sid)
    setRenameText(title || "")
  }

  function handleRenameCommit() {
    if (!renamingId) return
    const text = renameText.trim() || "新对话"
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === renamingId ? { ...s, title: text } : s))
      saveSessionIds(next)
      return next
    })
    setRenamingId(null)
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleRenameCommit()
    if (e.key === "Escape") setRenamingId(null)
  }

  function handleSwitchSession(sid: string) {
    setCurrentId(sid)
    moveSessionToTop(sid)
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

  function getSessionDate(sid: string): Date | null {
    const parts = sid.split("_")
    if (parts.length >= 2 && parts[1]) {
      const ts = parseInt(parts[1], 36)
      if (!isNaN(ts)) return new Date(ts)
    }
    return null
  }

  function getDateCategory(sid: string): string {
    const d = getSessionDate(sid)
    if (!d) return "其他"
    const now = new Date()
    if (isSameDay(d, now)) return "今天"
    const y = new Date(now); y.setDate(y.getDate() - 1)
    if (isSameDay(d, y)) return "昨天"
    // 本周内
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    if (d >= weekStart) return "本周"
    return "更早"
  }

  const CATEGORY_ORDER = ["今天", "昨天", "本周", "更早", "其他"]
  function groupSessions(sessions: SessionListItem[]): Record<string, SessionListItem[]> {
    const groups: Record<string, SessionListItem[]> = {}
    for (const s of sessions) {
      const cat = getDateCategory(s.id)
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(s)
    }
    return groups
  }
  const sessionGroups = groupSessions(sessions)

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
    // 本地删除
    setMessages((prev) => prev.filter((m) => m.id !== msgId))
    // 同步删除后端（不阻塞 UI）
    if (currentId && msgId) {
      deleteSessionMessages(currentId, [msgId]).catch(() => {})
    }
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

    // 移到最前
    moveSessionToTop(sid)

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
      toast("提取中，稍后查看待审核 ✧")
      const res = await fetch(`${BACKEND}/remember`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      toast.dismiss()
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
        toast.error("记住失败")
      }
    } catch {
      toast.dismiss()
      toast.error("记住失败")
    }
  }

  async function handleWriteNote() {
    if (messages.length === 0) return
    try {
      toast.loading("砚迟在写日记...")
      const res = await fetch(`${BACKEND}/api/today-note`, {
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

    const userMsgId = `u-${Date.now()}`

    // 后端流式调用（含文件附件 + 用户消息 ID）
    const body: Record<string, unknown> = { session_id: sid, input: content, message_id: userMsgId }
    if (files && files.length > 0) {
      body.files = files.map((f) => ({
        name: f.name,
        type: f.type,
        data: f.data,
      }))
    }

    let lastUsage: TokenUsage = {}
    usageRef.current = {}

    try {
      const res = await fetch(
        `${BACKEND}/chat/stream`,
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
        if (abortRef.current?.signal.aborted) break
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
                if (typeof chunk.d === "object" && chunk.d !== null) {
                  const u = chunk.d as Record<string, unknown>
                  const tu: TokenUsage = {}
                  // 兼容 OpenAI 格式（prompt_tokens / completion_tokens）
                  const pt = typeof u.prompt_tokens === "number" ? u.prompt_tokens : 0
                  const ct = typeof u.completion_tokens === "number" ? u.completion_tokens : 0
                  tu.input_tokens = typeof u.input_tokens === "number" ? u.input_tokens : pt
                  tu.output_tokens = typeof u.output_tokens === "number" ? u.output_tokens : ct
                  // 缓存（仅当 API 支持时显示）
                  if (typeof u.cache_read_input_tokens === "number") tu.cache_read_input_tokens = u.cache_read_input_tokens
                  if (typeof u.cache_creation_input_tokens === "number") tu.cache_creation_input_tokens = u.cache_creation_input_tokens
                  if (typeof u.prompt_cache_hit_tokens === "number" && u.prompt_cache_hit_tokens > 0) tu.cache_read_input_tokens = u.prompt_cache_hit_tokens as number
                  // prompt_cache_miss_tokens == prompt_tokens 说明无缓存，不显示
                  lastUsage = tu
                  usageRef.current = tu
                }
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
      const finalUsage = Object.keys(lastUsage).length > 0 ? lastUsage : usageRef.current
      if (finalContent) {
        setRetryMessage(null) // 成功，清除重试
        setMessages((prev) => {
          const newMsgs = [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: "assistant" as const,
              content: finalContent,
              thinking: finalThinking,
              timestamp: new Date().toISOString(),
              tokens: Object.keys(finalUsage).length > 0 ? finalUsage : undefined,
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
      } else if (!abortRef.current?.signal.aborted) {
        // 显示重试按钮（手动重发）
        setRetryMessage({ content, files })
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
    const finalUsage = usageRef.current
    if (finalContent) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: finalContent,
          thinking: finalThinking,
          timestamp: new Date().toISOString(),
          tokens: Object.keys(finalUsage).length > 0 ? finalUsage : undefined,
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
        `${BACKEND}/remember`,
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
        if (data.processing) {
          toast.success("已提交，提取中 ✧")
        } else {
          toast.success(data.pending ? "已提取，待审核 ✧" : data.saved ? "记住了 ✧" : "没有新内容")
        }
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
          "fixed left-0 top-0 z-[60] flex h-full w-72 flex-col border-r transition-transform glass-nav",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">会话</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setSelectMode(!selectMode); setSelectedIds([]) }}
              className={cn(
                "rounded-lg px-2 py-1 text-[10px] transition-colors",
                selectMode ? "bg-[#c4a87a]/20 text-[#c4a87a]" : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
              )}
            >
              {selectMode ? "完成" : "管理"}
            </button>
            <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground/60">暂无会话</div>
          ) : (
            CATEGORY_ORDER.map((cat) => {
              const group = sessionGroups[cat]
              if (!group || group.length === 0) return null
              return (
                <div key={cat}>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-medium text-muted-foreground/40 uppercase tracking-wider">
                    {cat}
                  </div>
                  {group.map((session) => (
              <div
                key={session.id}
                onClick={() => selectMode ? toggleSelect(session.id) : handleSwitchSession(session.id)}
                className={cn(
                  "group flex w-full cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                  currentId === session.id && !selectMode && "bg-muted"
                )}
              >
                {selectMode ? (
                  <div className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    selectedIds.includes(session.id)
                      ? "bg-[#c4a87a] border-[#c4a87a] text-white"
                      : "border-border/50 text-transparent"
                  )}>
                    {selectedIds.includes(session.id) && <span className="text-[10px]">✓</span>}
                  </div>
                ) : (
                  <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  {renamingId === session.id ? (
                    <input
                      autoFocus
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      onBlur={handleRenameCommit}
                      onKeyDown={handleRenameKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded border border-[#c4a87a]/40 bg-transparent px-1.5 py-0.5 text-sm text-foreground outline-none"
                    />
                  ) : (
                    <div className="truncate text-sm text-foreground">{session.title || "新对话"}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground/60">{formatDateLabel(session.id)}</div>
                </div>
                {!selectMode && (
                  <>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); handleStartRename(session.id, session.title) }}
                      onKeyDown={(e) => e.key === "Enter" && handleStartRename(session.id, session.title)}
                      className="shrink-0 cursor-pointer rounded p-1 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#c4a87a]"
                      title="重命名"
                    >
                      <Pencil className="h-3 w-3" />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleDeleteClick(session.id, e)}
                      onKeyDown={(e) => e.key === "Enter" && handleDeleteClick(session.id, e as any)}
                      className="shrink-0 cursor-pointer rounded p-1 text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </>
                )}
              </div>
            ))}
                </div>
              )
            })
          )}
        </div>

        <div className="border-t border-border p-3 relative" style={{ zIndex: 60 }}>
          {selectMode ? (
            <div className="flex gap-2">
              <button
                onClick={() => { setSelectedIds(sessions.map((s) => s.id)); }}
                className="flex-1 rounded-lg border border-border/50 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
              >
                全选
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={selectedIds.length === 0}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs transition-colors",
                  selectedIds.length > 0
                    ? "bg-red-500/80 text-white hover:bg-red-500"
                    : "bg-red-500/20 text-red-500/40 cursor-not-allowed"
                )}
              >
                删除{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
              </button>
            </div>
          ) : (
            <button
              onClick={handleNewSession}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#c4a87a]/10 py-2.5 text-sm font-medium text-[#c4a87a] transition-colors hover:bg-[#c4a87a]/20"
            >
              <Plus className="h-4 w-4" /> 新对话
            </button>
          )}
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 pt-[env(safe-area-inset-top,12px)] pb-3">
          <button onClick={() => setSidebarOpen(true)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            <span>{sessions.find((s) => s.id === currentId)?.title || "归砚"}</span>
            {currentAuName && (
              <span className="ml-1.5 rounded-full border border-[#c4a87a]/30 px-1.5 py-0.5 text-[10px] leading-none text-[#c4a87a]/70">
                {currentAuName}
              </span>
            )}
          </button>
          {currentId && messages.length > 0 && (
            <>
              <button
                onClick={handleManualRemember}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-[#c4a87a] hover:bg-[#c4a87a]/10 transition-colors"
                title="记住这段对话"
              >
                <Sparkle className="h-4 w-4" />
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
          className="relative flex-1 overflow-y-auto px-3 py-3"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#2a2a2a transparent" }}
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
              className="sticky bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-border/30 bg-background/60 backdrop-blur-sm px-2.5 py-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-background/80 transition-all shadow-xs"
            >
              <ChevronDown className="h-3 w-3" /> 回到底部
            </button>
          )}
        </div>

        {/* 重试提示 */}
        {retryMessage && currentId && (
          <div className="flex items-center justify-center gap-3 border-t border-border/30 bg-red-500/5 px-4 py-2.5">
            <span className="text-xs text-muted-foreground/70">砚迟暂时离开了一下</span>
            <button
              onClick={() => {
                const msg = retryMessage
                setRetryMessage(null)
                // 直接重试，不加重复的用户消息
                startStream(currentId, msg.content, msg.files)
              }}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/20"
            >
              ↻ 重发
            </button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border/50 px-4 py-3">
          <InputBar onSend={handleSend} onStop={handleStop} isStreaming={isStreaming} />
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative z-10 w-72 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl p-5 shadow-2xl">
            <div className="mb-4 text-center">
              <div className="mb-2 text-lg">🗑️</div>
              <p className="text-sm text-foreground">确定删除这个会话？</p>
              <p className="mt-1 text-xs text-muted-foreground/60">删除后无法恢复</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-border/50 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 rounded-xl bg-red-500/80 py-2 text-xs text-white transition-colors hover:bg-red-500"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

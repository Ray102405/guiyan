"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, BookMarked, Sparkles, MessageSquare, FileText, Search, Star, Check, X, Pencil, Trash2, Clock, CheckSquare, Square, BookOpen, CalendarHeart, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { getNotesList, getNoteContent } from "@/lib/api"
import type { NoteItem } from "@/lib/api"
import { MoodIcon } from "@/components/mood/mood-icon"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/backend"

interface TimelineItem {
  id: string
  date: string
  title: string
  preview: string
  highlighted: boolean
}

interface TimelineData {
  chats: TimelineItem[]
  notes: TimelineItem[]
  discussions: TimelineItem[]
  highlights: TimelineItem[]
}

interface PendingMemory {
  id: string
  category: string
  date: string
  content: string
  status: string
  createdAt: string
}

interface ConfirmedMemory {
  id: string
  category: string
  date: string
  content: string
  createdAt: string
  favorite?: boolean
}

interface MoodRecord {
  date: string
  mood: string
  emoji: string
  label: string
  updatedAt: string
}

interface CalendarEvent {
  id: string
  title: string
  date: string
  type: "exam" | "deadline" | "anniversary" | "custom"
  recurring: boolean
  note: string
}

export default function MemoriesPage() {
  const router = useRouter()
  const [data, setData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"highlights" | "chats" | "notes" | "discussions" | "review" | "memorybank" | "life">("life")
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null)
  const [notesList, setNotesList] = useState<NoteItem[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [viewingNote, setViewingNote] = useState<{ date: string; content: string } | null>(null)
  const [itemContent, setItemContent] = useState("")
  const [contentLoading, setContentLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [moodHistory, setMoodHistory] = useState<MoodRecord[]>([])
  const [moodLoading, setMoodLoading] = useState(false)
  const [showMoreTabs, setShowMoreTabs] = useState(false)

  // 审核相关
  const [pendingMemories, setPendingMemories] = useState<PendingMemory[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  // 记忆库相关
  const [confirmedMemories, setConfirmedMemories] = useState<ConfirmedMemory[]>([])
  const [confirmedLoading, setConfirmedLoading] = useState(false)
  const [memoryFilter, setMemoryFilter] = useState<string>("all")
  const [memorySearch, setMemorySearch] = useState("")
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState<string | null>(null)
  const [editContentText, setEditContentText] = useState("")
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 日程
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [showCalendarForm, setShowCalendarForm] = useState(false)
  const [formTitle, setFormTitle] = useState("")
  const [formDate, setFormDate] = useState("")
  const [formType, setFormType] = useState<"exam" | "deadline" | "anniversary" | "custom">("custom")
  const [formRecurring, setFormRecurring] = useState(false)
  const [formNote, setFormNote] = useState("")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    loadTimeline()
    loadMoodHistory()
    if (tab === "review") loadPendingMemories()
    if (tab === "memorybank") loadConfirmedMemories()
    if (tab === "life") loadCalendar()
  }, [])

  // 页面可见时自动刷新时间线 + 笔记
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadTimeline()
        if (tab === "notes") loadNotesList()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [tab])

  useEffect(() => {
    if (tab === "review") loadPendingMemories()
    if (tab === "memorybank") loadConfirmedMemories()
    if (tab === "life") { loadMoodHistory(); loadCalendar() }
    if (tab === "notes") loadNotesList()
    if (tab === "chats" || tab === "highlights") loadTimeline()
  }, [tab])

  async function loadTimeline() {
    try {
      const res = await fetch(`${API_BASE}/api/timeline`)
      if (!res.ok) throw new Error("加载失败")
      const json = await res.json()
      setData(json)
    } catch {
      toast.error("加载回忆失败")
    } finally {
      setLoading(false)
    }
  }

  async function loadPendingMemories() {
    setPendingLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/memory/pending`)
      if (!res.ok) throw new Error("加载失败")
      const json = await res.json()
      setPendingMemories(json.pending || [])
    } catch {
      toast.error("加载待审核记忆失败")
    } finally {
      setPendingLoading(false)
    }
  }

  async function loadConfirmedMemories() {
    setConfirmedLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/memory/index`)
      if (!res.ok) throw new Error("加载失败")
      const json = await res.json()
      setConfirmedMemories(json.memories || [])
    } catch {
      toast.error("加载记忆库失败")
    } finally {
      setConfirmedLoading(false)
    }
  }

  async function loadNotesList() {
    setNotesLoading(true)
    try {
      const data = await getNotesList()
      setNotesList(data.notes)
    } catch {
      setNotesList([])
    } finally {
      setNotesLoading(false)
    }
  }

  // 加载笔记列表（tab 切换时）
  useEffect(() => {
    if (tab === "notes") loadNotesList()
  }, [tab])

  async function loadCalendar() {
    setCalendarLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/calendar`)
      if (!res.ok) throw new Error("加载失败")
      const json = await res.json()
      setCalendarEvents(json.entries || [])
    } catch {
      toast.error("加载日程失败")
    } finally {
      setCalendarLoading(false)
    }
  }

  async function handleAddCalendar() {
    if (!formTitle.trim() || !formDate) {
      toast.error("请填写标题和日期")
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          date: formDate,
          type: formType,
          recurring: formRecurring,
          note: formNote.trim(),
        }),
      })
      if (!res.ok) throw new Error()
      const entry = await res.json()
      setCalendarEvents((prev) => [...prev, entry])
      setShowCalendarForm(false)
      setFormTitle("")
      setFormDate("")
      setFormType("custom")
      setFormRecurring(false)
      setFormNote("")
      toast.success("日程已添加")
    } catch {
      toast.error("添加失败")
    }
  }

  async function handleDeleteCalendar(id: string) {
    if (!confirm("确定删除这条日程？")) return
    try {
      const res = await fetch(`${API_BASE}/api/calendar/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setCalendarEvents((prev) => prev.filter((e) => e.id !== id))
      toast.success("已删除")
    } catch {
      toast.error("删除失败")
    }
  }

  async function loadMoodHistory() {
    setMoodLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/mood/history`)
      if (!res.ok) throw new Error("加载失败")
      const json = await res.json()
      setMoodHistory(json.history || [])
    } catch {
      toast.error("加载心情历史失败")
    } finally {
      setMoodLoading(false)
    }
  }

  async function handleReview(id: string, action: "approve" | "reject") {
    try {
      const body: any = { action, id }
      if (action === "approve" && editingId === id && editText.trim()) {
        body.edited_content = editText.trim()
      }
      const res = await fetch(`${API_BASE}/api/memory/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const result = await res.json()
      toast.success(action === "approve" ? `已确认 (共${result.approved}条)` : "已忽略")
      setPendingMemories((prev) => prev.filter((m) => m.id !== id))
      setEditingId(null)
      setEditText("")
    } catch {
      toast.error("操作失败")
    }
  }

  async function handleApproveAll() {
    try {
      const res = await fetch(`${API_BASE}/api/memory/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_all" }),
      })
      if (!res.ok) throw new Error()
      const result = await res.json()
      toast.success(`已确认全部 (共${result.approved}条)`)
      setPendingMemories([])
    } catch {
      toast.error("操作失败")
    }
  }

  async function handleDeleteMemory(id: string) {
    if (!confirm("确定删除这条记忆？")) return
    try {
      const res = await fetch(`${API_BASE}/api/memory/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error()
      toast.success("已删除")
      loadTimeline()
    } catch {
      toast.error("删除失败")
    }
  }

  async function toggleHighlight(item: TimelineItem, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      const res = await fetch(`${API_BASE}/api/timeline/highlight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      })
      if (!res.ok) return
      const result = await res.json()
      setSelectedItem((prev) => prev && prev.id === item.id ? { ...prev, highlighted: result.highlighted } : prev)
      setData((prev) => {
        if (!prev) return prev
        const update = (items: TimelineItem[]) =>
          items.map((i) => (i.id === item.id ? { ...i, highlighted: result.highlighted } : i))
        return {
          ...prev,
          chats: update(prev.chats),
          notes: update(prev.notes),
          highlights: result.highlighted
            ? [...prev.highlights, { ...item, highlighted: true }]
            : prev.highlights.filter((h) => h.id !== item.id),
        }
      })
    } catch {
      toast.error("操作失败")
    }
  }

  async function openContent(item: TimelineItem) {
    setSelectedItem(item)
    setContentLoading(true)
    setItemContent("")
    try {
      const res = await fetch(`${API_BASE}/api/timeline/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      })
      if (!res.ok) throw new Error("加载失败")
      const json = await res.json()
      setItemContent(json.content)
    } catch {
      setItemContent("加载失败")
    } finally {
      setContentLoading(false)
    }
  }

  function memoryCategoryColor(cat: string): string {
    switch (cat) {
      case "喜好与习惯": return "text-blue-400 bg-blue-400/10"
      case "承诺与约定": return "text-amber-400 bg-amber-400/10"
      case "关系里程碑": return "text-rose-400 bg-rose-400/10"
      case "亲密": return "text-pink-400 bg-pink-400/10"
      case "日常": return "text-green-400 bg-green-400/10"
      default: return "text-muted-foreground bg-muted"
    }
  }

  // ══ 待审核 tab ═══════════════════════════════════
  async function handleOpenNote(date: string) {
    try {
      const data = await getNoteContent(date)
      setViewingNote(data)
    } catch {
      toast.error("加载笔记失败")
    }
  }

  function renderNotesTab() {
    if (notesLoading) {
      return <div className="flex items-center justify-center py-12"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[#c4a87a] border-t-transparent" /></div>
    }

    if (viewingNote) {
      return (
        <div className="space-y-3">
          <button onClick={() => setViewingNote(null)} className="text-xs text-muted-foreground hover:text-foreground">
            ← 返回列表
          </button>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <h2 className="text-sm font-medium text-foreground mb-2">{viewingNote.date}</h2>
            <div className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed">{viewingNote.content}</div>
          </div>
        </div>
      )
    }

    if (notesList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <FileText className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground/60">暂无笔记</p>
        </div>
      )
    }

    async function toggleNoteHighlight(note: NoteItem, e: React.MouseEvent) {
      e.stopPropagation()
      try {
        const res = await fetch(`${API_BASE}/api/timeline/highlight`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: note.id }),
        })
        if (!res.ok) return
        const result = await res.json()
        setNotesList((prev) =>
          prev.map((n) => (n.date === note.date ? { ...n, highlighted: result.highlighted } : n))
        )
      } catch { /* silent */ }
    }

    return (
      <div className="space-y-2">
        {notesList.map((note) => (
          <div
            key={note.id}
            onClick={() => handleOpenNote(note.date)}
            className="w-full rounded-xl border border-border/50 bg-card p-3 text-left hover:bg-muted/30 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{note.date}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => toggleNoteHighlight(note, e)}
                  className={cn(
                    "rounded-md p-1 transition-colors",
                    note.highlighted
                      ? "text-[#c4a87a]"
                      : "text-muted-foreground/30 hover:text-[#c4a87a]"
                  )}
                  title={note.highlighted ? "取消收藏" : "收藏"}
                >
                  <Star className={cn("h-3.5 w-3.5", note.highlighted && "fill-[#c4a87a]")} />
                </button>
                {note.label && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded",
                    note.label === "RP" ? "bg-purple-500/10 text-purple-400" : "bg-[#c4a87a]/10 text-[#c4a87a]"
                  )}>{note.label}</span>
                )}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/70 line-clamp-2">{note.preview}</p>
          </div>
        ))}
      </div>
    )
  }

  function renderReviewTab() {
    if (pendingLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#c4a87a] border-t-transparent" />
        </div>
      )
    }

    if (pendingMemories.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <Clock className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground/60">没有待审核的记忆</p>
          <p className="text-xs text-muted-foreground/40 text-center">
            在聊天中点击 ✧ 书签按钮<br />新提取的记忆会出现在这里等待确认
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {/* 一键全部确认 */}
        {pendingMemories.length > 1 && (
          <button
            onClick={handleApproveAll}
            className="w-full rounded-xl border border-border/50 bg-card p-3 text-xs text-center text-muted-foreground hover:bg-muted/30 transition-colors"
          >
            确认全部 {pendingMemories.length} 条
          </button>
        )}

        {pendingMemories.map((mem) => (
          <div
            key={mem.id}
            className="rounded-xl border border-border/50 bg-card p-3 space-y-2"
          >
            {/* 类别标签 */}
            <div className="flex items-center gap-2">
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", memoryCategoryColor(mem.category))}>
                {mem.category}
              </span>
              <span className="text-[10px] text-muted-foreground/40">{mem.date}</span>
            </div>

            {/* 内容（可编辑） */}
            {editingId === mem.id ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:border-ring focus:outline-none resize-none"
                rows={3}
              />
            ) : (
              <p className="text-xs text-foreground/80 leading-relaxed">{mem.content}</p>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleReview(mem.id, "approve")}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-green-600 bg-green-500/10 hover:bg-green-500/20 transition-colors"
              >
                <Check className="h-3 w-3" /> 确认
              </button>
              <button
                onClick={() => handleReview(mem.id, "reject")}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                <X className="h-3 w-3" /> 忽略
              </button>
              {editingId === mem.id ? (
                <button
                  onClick={() => { setEditingId(null); setEditText("") }}
                  className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  取消
                </button>
              ) : (
                <button
                  onClick={() => { setEditingId(mem.id); setEditText(mem.content) }}
                  className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="h-3 w-3 inline-block mr-0.5" /> 修改
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ══ 记忆库 tab ═══════════════════════════════════
  function renderMemoryBankTab() {
    if (confirmedLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#c4a87a] border-t-transparent" />
        </div>
      )
    }

    // 筛选逻辑
    let filtered = confirmedMemories
    if (memoryFilter === "favorites") {
      filtered = filtered.filter((m) => m.favorite)
    } else if (memoryFilter !== "all") {
      filtered = filtered.filter((m) => m.category === memoryFilter)
    }
    if (memorySearch.trim()) {
      filtered = filtered.filter(
        (m) => m.content.includes(memorySearch) || m.category.includes(memorySearch)
      )
    }

    if (confirmedMemories.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <BookMarked className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground/60">记忆库是空的</p>
          <p className="text-xs text-muted-foreground/40 text-center">
            审核通过的记忆会出现在这里
          </p>
        </div>
      )
    }

    const categories = ["all", "favorites", "喜好与习惯", "承诺与约定", "关系里程碑", "亲密", "日常", "其他"]
    const catCount = (cat: string) => {
      if (cat === "all") return confirmedMemories.length
      if (cat === "favorites") return confirmedMemories.filter((m) => m.favorite).length
      return confirmedMemories.filter((m) => m.category === cat).length
    }

    return (
      <div className="space-y-2">
        {/* 搜索 + 选择模式 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
            <input
              value={memorySearch}
              onChange={(e) => setMemorySearch(e.target.value)}
              placeholder="搜索记忆……"
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
            />
          </div>
          <button
            onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()) }}
            className={cn(
              "shrink-0 rounded-lg border px-2.5 py-2 text-xs transition-colors",
              selectMode
                ? "border-[#c4a87a] bg-[#c4a87a]/10 text-[#c4a87a]"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 批量删除栏 */}
        {selectMode && selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
            <span className="text-xs text-red-500">已选 {selectedIds.size} 条</span>
            <button
              onClick={async () => {
                if (!confirm(`确定删除选中的 ${selectedIds.size} 条记忆？`)) return
                try {
                  const res = await fetch(`${API_BASE}/api/memory/batch-delete`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: Array.from(selectedIds) }),
                  })
                  if (res.ok) {
                    toast.success(`已删除 ${selectedIds.size} 条`)
                    setConfirmedMemories((prev) => prev.filter((m) => !selectedIds.has(m.id)))
                    setSelectedIds(new Set())
                    setSelectMode(false)
                  }
                } catch { toast.error("批量删除失败") }
              }}
              className="rounded-lg bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600 transition-colors"
            >
              <Trash2 className="h-3 w-3 inline-block mr-1" />删除选中
            </button>
          </div>
        )}

        {/* 分类筛选 */}
        <div className="flex gap-1 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setMemoryFilter(cat)}
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors",
                memoryFilter === cat
                  ? cat === "all"
                    ? "bg-[#c4a87a]/10 text-[#c4a87a]"
                    : memoryCategoryColor(cat)
                  : "text-muted-foreground/60 hover:bg-muted"
              )}
            >
              {cat === "all" ? "全部" : cat === "favorites" ? "⭐ 收藏" : cat}
              <span className="ml-1 opacity-60">{catCount(cat)}</span>
            </button>
          ))}
        </div>

        {/* 空筛选结果 */}
        {filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground/60">
            没有匹配的记忆
          </div>
        )}

        {filtered.map((mem) => (
          <div
            key={mem.id}
            className="rounded-xl border border-border/50 bg-card p-3 space-y-1.5"
          >
            <div className="flex items-center gap-2">
              {/* 多选复选框 */}
              {selectMode && (
                <button
                  onClick={() => {
                    const next = new Set(selectedIds)
                    if (next.has(mem.id)) next.delete(mem.id)
                    else next.add(mem.id)
                    setSelectedIds(next)
                  }}
                  className="shrink-0"
                >
                  {selectedIds.has(mem.id)
                    ? <CheckSquare className="h-4 w-4 text-[#c4a87a]" />
                    : <Square className="h-4 w-4 text-muted-foreground/40" />
                  }
                </button>
              )}
              {/* 分类标签（可点击修改） */}
              <div className="relative">
                <button
                  onClick={() => { if (!selectMode) setEditingCategory(editingCategory === mem.id ? null : mem.id) }}
                  className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80", memoryCategoryColor(mem.category))}
                >
                  {mem.category} ✎
                </button>
                {editingCategory === mem.id && (
                  <div className="absolute top-full left-0 mt-1 z-10 rounded-lg border border-border/50 bg-card shadow-lg p-1 space-y-0.5 min-w-[100px]">
                    {["喜好与习惯", "承诺与约定", "关系里程碑", "亲密", "日常", "其他"].map((cat) => (
                      <button
                        key={cat}
                        onClick={async () => {
                          try {
                            const res = await fetch(`${API_BASE}/api/memory/edit`, {
                              method: "POST", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: mem.id, category: cat }),
                            })
                            if (res.ok) {
                              setConfirmedMemories((prev) =>
                                prev.map((m) => (m.id === mem.id ? { ...m, category: cat } : m))
                              )
                              toast.success("分类已更新")
                            }
                          } catch { toast.error("更新失败") }
                          setEditingCategory(null)
                        }}
                        className={cn(
                          "w-full text-left rounded px-2 py-1 text-[10px] transition-colors",
                          cat === mem.category
                            ? memoryCategoryColor(cat)
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* 收藏按钮 */}
              <button
                onClick={async () => {
                  const newVal = !mem.favorite
                  try {
                    const res = await fetch(`${API_BASE}/api/memory/favorite`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: mem.id, favorite: newVal }),
                    })
                    if (res.ok) {
                      setConfirmedMemories((prev) =>
                        prev.map((m) => (m.id === mem.id ? { ...m, favorite: newVal } : m))
                      )
                    }
                  } catch {}
                }}
                className="ml-auto"
              >
                <Star className={cn("h-3.5 w-3.5",
                  mem.favorite ? "fill-[#c4a87a] text-[#c4a87a]" : "text-muted-foreground/30 hover:text-[#c4a87a]"
                )} />
              </button>
              <span className="text-[10px] text-muted-foreground/40">{mem.date}</span>
            </div>
            {/* 内容（可编辑） */}
            {editingContent === mem.id ? (
              <textarea
                value={editContentText}
                onChange={(e) => setEditContentText(e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:border-ring focus:outline-none resize-none"
                rows={3}
              />
            ) : (
              <p className="text-xs text-foreground/80 leading-relaxed">{mem.content}</p>
            )}
            <div className="flex items-center gap-1.5 pt-1">
              {editingContent === mem.id ? (
                <>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_BASE}/api/memory/edit`, {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: mem.id, content: editContentText.trim() }),
                        })
                        if (res.ok) {
                          setConfirmedMemories((prev) =>
                            prev.map((m) => (m.id === mem.id ? { ...m, content: editContentText.trim() } : m))
                          )
                          toast.success("内容已更新")
                        }
                      } catch { toast.error("更新失败") }
                      setEditingContent(null)
                      setEditContentText("")
                    }}
                    className="rounded-lg px-2.5 py-1 text-xs text-green-600 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                  >
                    <Check className="h-3 w-3 inline-block mr-0.5" /> 保存
                  </button>
                  <button
                    onClick={() => { setEditingContent(null); setEditContentText("") }}
                    className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3 w-3 inline-block mr-0.5" /> 取消
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setEditingContent(mem.id); setEditContentText(mem.content) }}
                  className="rounded-lg px-2 py-1 text-xs text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="h-3 w-3 inline-block mr-0.5" /> 编辑
                </button>
              )}
              <button
                onClick={async () => {
                  if (!confirm("确定删除这条记忆？")) return
                  try {
                    const res = await fetch(`${API_BASE}/api/memory/delete`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: mem.id }),
                    })
                    if (res.ok) {
                      toast.success("已删除")
                      setConfirmedMemories((prev) => prev.filter((m) => m.id !== mem.id))
                    }
                  } catch { toast.error("删除失败") }
                }}
                className="rounded-lg px-2 py-1 text-xs text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-3 w-3 inline-block mr-0.5" /> 删除
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ══ 生活 tab ══════════════════════════════════════
  function renderLifeTab() {
    if (moodLoading || calendarLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#c4a87a] border-t-transparent" />
        </div>
      )
    }

    // ── 心情数据 ──
    const moodMap = new Map<string, MoodRecord>()
    for (const r of moodHistory) {
      moodMap.set(r.date, r)
    }
    const recentSorted = [...moodHistory].sort((a, b) => a.date.localeCompare(b.date))
    const recent = recentSorted.slice(-14)

    // ── 日程数据 ──
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().slice(0, 10)

    const eventsByDate = new Map<string, CalendarEvent[]>()
    for (const e of calendarEvents) {
      const existing = eventsByDate.get(e.date) || []
      existing.push(e)
      eventsByDate.set(e.date, existing)
    }

    const sevenDaysLater = new Date(today)
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
    const upcoming = [...calendarEvents]
      .filter((e) => {
        const d = new Date(e.date + "T00:00:00")
        return d >= today && d <= sevenDaysLater
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    // ── 日历网格 ──
    const dates = moodHistory.map((r) => r.date).sort()
    const earliest = dates[0] || todayStr
    const months: string[] = []
    let cursor = earliest.slice(0, 7)
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
    while (cursor <= currentMonth) {
      months.push(cursor)
      const [y, m] = cursor.split("-").map(Number)
      const next = new Date(y, m, 1)
      cursor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
    }

    const TYPE_STYLE: Record<string, string> = {
      exam: "text-rose-400 bg-rose-400/10",
      deadline: "text-orange-400 bg-orange-400/10",
      anniversary: "text-pink-400 bg-pink-400/10",
      custom: "text-blue-400 bg-blue-400/10",
    }
    const TYPE_LABEL: Record<string, string> = {
      exam: "考试", deadline: "截止", anniversary: "纪念日", custom: "其他",
    }

    return (
      <div className="space-y-6 pb-4">
        {/* ① 近14天心情趋势 */}
        {recent.length > 1 && (
          <div className="rounded-xl border border-border/50 bg-card p-3">
            <div className="mb-1.5 text-[10px] text-muted-foreground/50">近 14 天心情</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {recent.map((r) => (
                <div key={r.date} className="flex flex-col items-center gap-0.5 shrink-0" title={`${r.date} · ${r.label}`}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/40">
                    <MoodIcon mood={r.mood} className="h-5 w-5 text-[#c4a87a]" />
                  </div>
                  <span className="text-[8px] text-muted-foreground/40">{r.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ② 日历格子 */}
        {months.map((month) => {
          const [y, m] = month.split("-").map(Number)
          const firstDay = new Date(y, m - 1, 1).getDay()
          const daysInMonth = new Date(y, m, 0).getDate()
          const isCurrentMonth = month === currentMonth
          const monthMoods = moodHistory.filter((r) => r.date.startsWith(month))
          const moodCount = monthMoods.length

          const cells: React.ReactNode[] = []
          for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`empty-${i}`} className="w-full aspect-square" />)
          }
          for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${month}-${String(d).padStart(2, "0")}`
            const record = moodMap.get(dateStr)
            const dayEvents = eventsByDate.get(dateStr)
            const isToday = dateStr === todayStr
            cells.push(
              <div
                key={dateStr}
                className={cn(
                  "relative flex flex-col items-center justify-center w-full aspect-square rounded-md text-xs transition-colors cursor-pointer",
                  isToday && "ring-1 ring-[#c4a87a]/40",
                  record ? "bg-muted/40 hover:bg-muted/70" : "hover:bg-muted/10"
                )}
                onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
              >
                <span className={cn("text-[9px] leading-none", record ? "text-muted-foreground/70" : "text-muted-foreground/20")}>
                  {d}
                </span>
                {record && <MoodIcon mood={record.mood} className="h-4 w-4 text-[#c4a87a] mt-0.5" />}
                {dayEvents && dayEvents.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#c4a87a]" />
                )}
              </div>
            )
          }

          return (
            <div key={month}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-xs font-semibold text-foreground">{month}</h3>
                <span className="text-[10px] text-muted-foreground/50">
                  {moodCount}/{isCurrentMonth ? new Date().getDate() : daysInMonth} 天有记录
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["日","一","二","三","四","五","六"].map((l) => (
                  <div key={l} className="text-center text-[9px] text-muted-foreground/40 font-medium">{l}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">{cells}</div>

              {selectedDate && selectedDate.startsWith(month) && (
                <div className="mt-2 rounded-xl border border-[#c4a87a]/20 bg-[#c4a87a]/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{selectedDate}</span>
                    <button onClick={() => setSelectedDate(null)} className="rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {(() => {
                    const mr = moodMap.get(selectedDate)
                    return mr ? (
                      <div className="flex items-center gap-2">
                        <MoodIcon mood={mr.mood} className="h-5 w-5 text-[#c4a87a]" />
                        <span className="text-xs text-muted-foreground/80">{mr.label}</span>
                      </div>
                    ) : null
                  })()}
                  {(() => {
                    const evs = eventsByDate.get(selectedDate)
                    return evs && evs.length > 0 ? (
                      <div className="space-y-1">
                        {evs.map((ev) => (
                          <div key={ev.id} className="flex items-center gap-2 text-xs text-muted-foreground/80">
                            <span className={cn("shrink-0 rounded px-1 py-0.5 text-[9px] font-medium", TYPE_STYLE[ev.type] || TYPE_STYLE.custom)}>
                              {TYPE_LABEL[ev.type] || ev.type}
                            </span>
                            <span>{ev.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : null
                  })()}
                  {!moodMap.get(selectedDate) && (!eventsByDate.get(selectedDate) || eventsByDate.get(selectedDate)!.length === 0) && (
                    <p className="text-xs text-muted-foreground/50">无记录</p>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* ③ 即将到来 */}
        {upcoming.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#c4a87a]" />
              <span className="text-[10px] font-medium text-[#c4a87a]">即将到来</span>
            </div>
            {upcoming.map((e) => {
              const diff = Math.ceil((new Date(e.date + "T00:00:00").getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              const label = diff === 0 ? "今天" : diff === 1 ? "明天" : `${diff} 天后`
              return (
                <div key={e.id} className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-2">
                  <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium", TYPE_STYLE[e.type])}>
                    {TYPE_LABEL[e.type] || e.type}
                  </span>
                  <span className="flex-1 text-xs text-foreground/80">{e.title}</span>
                  <span className={cn("text-[10px] font-medium", diff === 0 ? "text-[#c4a87a]" : "text-muted-foreground/50")}>{label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* ④ + 添加日程 */}
        {!showCalendarForm ? (
          <button
            onClick={() => setShowCalendarForm(true)}
            className="w-full rounded-xl border border-[#c4a87a]/30 bg-transparent py-3 text-xs text-[#c4a87a]/70 hover:bg-[#c4a87a]/5 hover:text-[#c4a87a] transition-colors"
          >
            + 添加日程
          </button>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">新日程</span>
              <button
                onClick={() => { setShowCalendarForm(false); setFormTitle(""); setFormDate(""); setFormType("custom"); setFormRecurring(false); setFormNote("") }}
                className="rounded-lg p-1 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="日程标题"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-ring focus:outline-none [color-scheme:dark]"
              />
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="rounded-lg border border-input bg-background px-2 py-2 text-xs text-foreground focus:border-ring focus:outline-none"
              >
                <option value="custom">其他</option>
                <option value="exam">考试</option>
                <option value="deadline">截止</option>
                <option value="anniversary">纪念日</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formRecurring}
                onChange={(e) => setFormRecurring(e.target.checked)}
                className="rounded border-border text-[#c4a87a] focus:ring-[#c4a87a]/30"
              />
              <span className="text-[10px] text-muted-foreground/60">每年重复</span>
            </label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="备注（可选）"
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none resize-none"
            />
            <button
              onClick={handleAddCalendar}
              className="w-full rounded-lg bg-[#c4a87a] py-2 text-xs font-medium text-white hover:bg-[#b89a6a] transition-colors"
            >
              保存
            </button>
          </div>
        )}

        {calendarEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <CalendarHeart className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground/60">还没有日程</p>
            <p className="text-xs text-muted-foreground/40 text-center">
              在首页选择心情、点底部按钮添加日程
            </p>
          </div>
        )}
      </div>
    )
  }

  // ══ 时间线 tab（精选/历史/笔记/读书）═════════════════════
  function getItems(): TimelineItem[] {
    if (!data) return []
    switch (tab) {
      case "highlights":
        return data.highlights.length > 0 ? data.highlights : []
      case "chats":
        return data.chats
      case "notes":
        return data.notes
      case "discussions":
        return data.discussions
      default:
        return []
    }
  }

  const items = getItems()
  const filteredItems = searchQuery
    ? items.filter((i) => i.title.includes(searchQuery) || i.preview?.includes(searchQuery))
    : items

  const grouped = filteredItems
    .sort((a, b) => (b.date || b.id).localeCompare(a.date || a.id))
    .reduce<Record<string, TimelineItem[]>>((acc, item) => {
      const dateKey = item.date ? item.date.slice(0, 7) : "未知"
      if (!acc[dateKey]) acc[dateKey] = []
      acc[dateKey].push(item)
      return acc
    }, {})

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#c4a87a] border-t-transparent" />
      </div>
    )
  }

  const showSearch = tab !== "review" && tab !== "memorybank" && tab !== "life"

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 px-4 pt-[env(safe-area-inset-top,12px)] pb-3">
        <button onClick={() => router.back()} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">回忆</h1>
        {tab === "review" && pendingMemories.length > 0 && (
          <span className="text-xs text-muted-foreground/60">{pendingMemories.length} 条待审核</span>
        )}
      </div>

      {/* 搜索（仅非审核 tab 显示） */}
      {showSearch && (
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索回忆……"
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-1">
          <div className="flex gap-1 overflow-x-auto flex-1">
            {/* 主 tab：始终显示 */}
            {([
              { key: "life" as const, label: "生活", icon: CalendarHeart },
              { key: "highlights" as const, label: "精选", icon: Sparkles },
              { key: "memorybank" as const, label: "记忆库", icon: BookMarked },
              { key: "review" as const, label: "待审核", icon: Clock },
              { key: "notes" as const, label: "笔记", icon: FileText },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelectedItem(null); setSearchQuery(""); setShowMoreTabs(false) }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0",
                  tab === t.key
                    ? "bg-[#c4a87a]/10 text-[#c4a87a]"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
                {t.key === "review" && pendingMemories.length > 0 && (
                  <span className="ml-0.5 bg-[#c4a87a] text-white rounded-full h-4 min-w-[16px] flex items-center justify-center text-[9px] px-1">
                    {pendingMemories.length}
                  </span>
                )}
                {t.key === "notes" && data?.notes && (
                  <span className="ml-0.5 text-[10px] opacity-60">{data.notes.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* 更多按钮（在 overflow 外面） */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMoreTabs(!showMoreTabs)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                showMoreTabs || ["chats","discussions"].includes(tab)
                  ? "bg-muted/50 text-muted-foreground"
                  : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30"
              )}
            >
              更多 ▾
            </button>

            {showMoreTabs && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMoreTabs(false)} />
                <div className="absolute right-0 z-20 mt-1 rounded-xl border border-border/50 bg-card shadow-lg p-1 min-w-[100px]">
                  {([
                    { key: "chats" as const, label: "历史", icon: MessageSquare },
                    { key: "discussions" as const, label: "读书", icon: BookOpen },
                  ] as const).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => { setTab(t.key); setSelectedItem(null); setSearchQuery(""); setShowMoreTabs(false) }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors",
                        tab === t.key
                          ? "bg-[#c4a87a]/10 text-[#c4a87a]"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <t.icon className="h-3.5 w-3.5 shrink-0" />
                      {t.label}
                      {t.key === "chats" && data?.chats && (
                        <span className="ml-auto text-[10px] opacity-60">{data.chats.length}</span>
                      )}
                      {t.key === "discussions" && data?.discussions && (
                        <span className="ml-auto text-[10px] opacity-60">{data.discussions.length}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-safe-bottom scroll-smooth [&>:first-child]:min-h-full">
        {tab === "review" ? (
          renderReviewTab()
        ) : tab === "memorybank" ? (
          renderMemoryBankTab()
        ) : tab === "life" ? (
          renderLifeTab()
        ) : tab === "notes" ? (
          renderNotesTab()
        ) : selectedItem ? (
          /* 内容详情 */
          <div className="space-y-3">
            <button
              onClick={() => setSelectedItem(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← 返回列表
            </button>
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground">{selectedItem.title}</h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleHighlight(selectedItem, e) }}
                    className={cn(
                      "rounded-lg p-1.5 transition-colors",
                      selectedItem.highlighted
                        ? "text-[#c4a87a]"
                        : "text-muted-foreground/50 hover:text-[#c4a87a]"
                    )}
                    title={selectedItem.highlighted ? "取消精选" : "标记精选"}
                  >
                    <Star className={cn("h-4 w-4", selectedItem.highlighted && "fill-[#c4a87a]")} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteMemory(selectedItem.id)
                      setSelectedItem(null)
                    }}
                    className="rounded-lg p-1 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {selectedItem.date && (
                <p className="mt-1 text-[10px] text-muted-foreground/40 flex items-center gap-1">
                  {selectedItem.date}
                  {(() => {
                    const m = moodHistory.find((r) => r.date === selectedItem.date)
                    return m ? <MoodIcon mood={m.mood} className="h-3.5 w-3.5 text-[#c4a87a]" title={m.label} /> : null
                  })()}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4">
              {contentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#c4a87a] border-t-transparent" />
                </div>
              ) : (
                <pre className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans">
                  {itemContent}
                </pre>
              )}
            </div>
          </div>
        ) : tab === "highlights" && data?.highlights.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Sparkles className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground/60">还没有精选事件</p>
            <p className="text-xs text-muted-foreground/40 text-center">
              在聊天记录或笔记中点击 ☆ 标记为精选
            </p>
          </div>
        ) : (
          /* 时间线列表 */
          <div className="space-y-6">
            {Object.entries(grouped).map(([month, monthItems]) => (
              <div key={month}>
                <h3 className="mb-2 text-[10px] font-medium text-muted-foreground/40 uppercase tracking-wider">
                  {month === "未知" ? "" : month}
                </h3>
                <div className="space-y-2">
                  {monthItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => openContent(item)}
                      className="group relative flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3 cursor-pointer transition-colors hover:border-border hover:bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground truncate">
                            {item.title}
                          </span>
                          {item.highlighted && (
                            <Star className="h-3 w-3 shrink-0 fill-[#c4a87a] text-[#c4a87a]" />
                          )}
                        </div>
                        {item.preview && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground/70 line-clamp-2 leading-relaxed">
                            {item.preview}
                          </p>
                        )}
                        {item.date && (
                          <p className="mt-1 text-[10px] text-muted-foreground/40">
                            {item.date}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={(e) => toggleHighlight(item, e)}
                          className={cn(
                            "rounded-md p-1.5 transition-colors",
                            item.highlighted
                              ? "text-[#c4a87a] bg-[#c4a87a]/10"
                              : "text-muted-foreground/50 hover:text-[#c4a87a] hover:bg-[#c4a87a]/10"
                          )}
                          title={item.highlighted ? "取消精选" : "标记精选"}
                        >
                          <Star className={cn("h-3.5 w-3.5", item.highlighted && "fill-[#c4a87a]")} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteMemory(item.id) }}
                          className="rounded-md p-1.5 text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && searchQuery && (
              <div className="py-8 text-center text-sm text-muted-foreground/60">
                没有找到 "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

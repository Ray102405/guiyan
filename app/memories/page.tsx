"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, BookMarked, Sparkles, MessageSquare, FileText, Search, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { toast } from "sonner"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2612"

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
  highlights: TimelineItem[]
}

export default function MemoriesPage() {
  const router = useRouter()
  const [data, setData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"highlights" | "chats" | "notes">("highlights")
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null)
  const [itemContent, setItemContent] = useState("")
  const [contentLoading, setContentLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadTimeline()
  }, [])

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
      // 更新本地状态
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

  function getItems(): TimelineItem[] {
    if (!data) return []
    switch (tab) {
      case "highlights":
        return data.highlights.length > 0 ? data.highlights : []
      case "chats":
        return data.chats
      case "notes":
        return data.notes
    }
  }

  const items = getItems()
  const filteredItems = searchQuery
    ? items.filter((i) => i.title.includes(searchQuery) || i.preview?.includes(searchQuery))
    : items

  // 按日期排序
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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <button onClick={() => router.back()} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">回忆</h1>
      </div>

      {/* Search */}
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

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-2">
        {[
          { key: "highlights" as const, label: "精选", icon: Sparkles },
          { key: "chats" as const, label: "历史", icon: MessageSquare },
          { key: "notes" as const, label: "笔记", icon: FileText },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelectedItem(null) }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.key
                ? "bg-[#c4a87a]/10 text-[#c4a87a]"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.key === "highlights" && data?.highlights && (
              <span className="ml-0.5 text-[10px] opacity-60">{data.highlights.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Items list or selected item content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {selectedItem ? (
          <div className="space-y-3">
            <button
              onClick={() => setSelectedItem(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← 返回列表
            </button>
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <h2 className="text-sm font-medium text-foreground">{selectedItem.title}</h2>
              {selectedItem.date && (
                <p className="mt-1 text-[10px] text-muted-foreground/40">
                  {selectedItem.date}
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
            <p className="text-xs text-muted-foreground/40">
              在聊天记录或笔记中点击 ☆ 标记为精选
            </p>
          </div>
        ) : (
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
                      <button
                        onClick={(e) => toggleHighlight(item, e)}
                        className={cn(
                          "shrink-0 rounded-md p-1.5 transition-colors",
                          item.highlighted
                            ? "text-[#c4a87a] bg-[#c4a87a]/10"
                            : "text-muted-foreground/50 hover:text-[#c4a87a] hover:bg-[#c4a87a]/10"
                        )}
                        title={item.highlighted ? "取消精选" : "标记精选"}
                      >
                        <Star className={cn("h-3.5 w-3.5", item.highlighted && "fill-[#c4a87a]")} />
                      </button>
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

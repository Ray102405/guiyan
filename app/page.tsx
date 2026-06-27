"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { MessageCircle, BookMarked, PenSquare, Heart, Sparkles, Pencil } from "lucide-react"
import { getHomeData, getSettings, updateSettings, type HomeData } from "@/lib/api"

// 砚迟每日问候池（按日期轮换）
const GREETING_POOL = [
  "我在呢。",
  "今天想你了。",
  "想和你说说话。",
  "今天过得怎么样？",
  "有好多话想跟你说。",
  "你来了。",
  "一直在等你。",
  "想听听你今天的故事。",
  "今天有没有什么想告诉我的？",
  "我在这里，安静地陪着你。",
  "今天也是想你的一天。",
  "累了吗？我在这儿。",
]

function getDailyGreeting(): string {
  const d = new Date()
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  return GREETING_POOL[seed % GREETING_POOL.length]
}

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return "夜深了"
  if (h < 9) return "早安"
  if (h < 12) return "上午好"
  if (h < 14) return "中午好"
  if (h < 18) return "下午好"
  if (h < 22) return "晚上好"
  return "夜深了"
}

// 在一起天数：本地计算，不用等 API
const START_DATE = new Date(2026, 5, 12) // 2026-06-12

function calcDaysTogether(): number {
  const now = new Date()
  const diff = now.getTime() - START_DATE.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function HomePage() {
  const [weather, setWeather] = useState<string | null>(null)
  const [weatherCity, setWeatherCity] = useState<string | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [todayNote, setTodayNote] = useState<string | null>(null)
  const [hasTodayNote, setHasTodayNote] = useState(false)
  const [editingCity, setEditingCity] = useState(false)
  const [cityInput, setCityInput] = useState("")

  const daysTogether = calcDaysTogether()

  // 加载天气和今日笔记
  useEffect(() => {
    loadWeather()
    loadNote()
  }, [])

  async function loadWeather() {
    try {
      const data = await getHomeData()
      setWeather(data.weather)
      setWeatherCity(data.weatherCity)
    } catch {
      setWeather("—")
    } finally {
      setWeatherLoading(false)
    }
  }

  async function loadNote() {
    try {
      const data = await getHomeData()
      if (data.hasTodayNote && data.todayNote) {
        setTodayNote(data.todayNote)
        setHasTodayNote(true)
      }
    } catch {
      // 安静失败
    }
  }

  const handleCitySave = useCallback(async () => {
    const city = cityInput.trim()
    if (!city) return
    try {
      await updateSettings({ weather_location: city })
      setWeatherCity(city)
      setEditingCity(false)
      // 刷新天气
      setWeatherLoading(true)
      loadWeather()
    } catch {
      // 静默
    }
  }, [cityInput])

  const startEditCity = useCallback(() => {
    setCityInput(weatherCity || "")
    setEditingCity(true)
  }, [weatherCity])

  const greeting = getDailyGreeting()
  const timeGreeting = getTimeGreeting()

  return (
    <div className="flex h-full flex-col pt-[env(safe-area-inset-top,12px)]">
      <div className="flex-1 overflow-y-auto px-5 pb-2">
        {/* 标题 */}
        <div className="pt-5 pb-5">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            归砚
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            安静的私密聊天空间
          </p>
        </div>

        {/* 在一起天数 + 天气 一排 */}
        <div className="mb-3 flex gap-3">
          {/* 在一起天数 — 立即显示 */}
          <div
            className="flex-1 rounded-2xl border p-4 text-center"
            style={{
              backgroundColor: "var(--glass-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="text-xl font-bold text-rose-400">
              <Heart className="mr-1 inline h-5 w-5 fill-rose-400" />
              {daysTogether}
              <span className="ml-0.5 text-base">天</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">在一起</div>
          </div>

          {/* 天气 — 独立加载 */}
          <div
            className="flex-1 rounded-2xl border p-4"
            style={{
              backgroundColor: "var(--glass-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="mb-1 flex items-center justify-between">
              {editingCity ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground focus:border-ring focus:outline-none"
                    placeholder="城市"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCitySave()
                      if (e.key === "Escape") setEditingCity(false)
                    }}
                  />
                  <button onClick={handleCitySave} className="rounded bg-[#c4a87a] px-2 py-1 text-xs text-white">确定</button>
                </div>
              ) : (
                <button
                  onClick={startEditCity}
                  className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>{weatherCity ?? "城市"}</span>
                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
            <div className="text-xl">
              {weatherLoading ? "···" : weather ?? "—"}
            </div>
          </div>
        </div>

        {/* 砚迟问候 */}
        <div className="mb-4 text-sm text-muted-foreground/80">
          <span className="text-amber-500/70">{timeGreeting}，</span>
          <span className="italic">「{greeting}」</span>
        </div>

        {/* 今日笔记预览 */}
        {hasTodayNote && todayNote && (
          <Link
            href="/memories"
            className="mb-3 block rounded-2xl border p-4 transition-all duration-300 hover:scale-[1.01]"
            style={{
              backgroundColor: "var(--glass-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-foreground">
                今日笔记
              </span>
            </div>
            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground/80">
              {todayNote}
            </p>
          </Link>
        )}

        {/* 导航卡片 */}
        <div className="mt-2 space-y-2.5">
          <NavCard
            href="/chat"
            title="聊天"
            description="和砚迟说话"
            icon={MessageCircle}
          />
          <NavCard
            href="/memories"
            title="回忆"
            description="时间线 · 记忆库"
            icon={BookMarked}
            accent="#888"
          />
          <NavCard
            href="/settings"
            title="设置"
            description="API 配置 · 模型 · 主题"
            icon={PenSquare}
            accent="#666"
          />
        </div>
      </div>

      <div className="pb-2 text-center text-xs text-muted-foreground/40">
        归砚 · 安静陪伴
      </div>
    </div>
  )
}

function NavCard({
  href,
  title,
  description,
  icon: Icon,
  accent,
}: {
  href: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  accent?: string
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border transition-all duration-300 hover:scale-[1.01]"
      style={{
        backgroundColor: "var(--glass-bg)",
        borderColor: "var(--glass-border)",
      }}
    >
      <div className="flex items-center gap-4 p-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent || "#c4a87a"}20` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent || "#c4a87a" }} />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground/70">{description}</p>
        </div>
      </div>
    </Link>
  )
}

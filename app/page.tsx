"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { MessageCircle, BookMarked, Calendar, Heart, Sparkles, Pencil, BarChart3, ChevronDown } from "lucide-react"
import { getHomeData, getSettings, updateSettings, getTodayTokenUsage, getMood, setMood as setMoodApi, MOOD_OPTIONS, type HomeData, getMemoryIndex, getCalendarEntries, getUpcomingCalendar, type CalendarEntry } from "@/lib/api"
import { cn } from "@/lib/utils"
import { MoodIcon, MOOD_LABELS } from "@/components/mood/mood-icon"

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

function formatCountdown(days: number): string {
  if (days === 0) return "今天"
  if (days === 1) return "明天"
  return `${days} 天后`
}

const MILESTONE_TYPES = new Set(["anniversary"])

export default function HomePage() {
  const [weather, setWeather] = useState<string | null>(null)
  const [weatherCity, setWeatherCity] = useState<string | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [editingCity, setEditingCity] = useState(false)
  const [cityInput, setCityInput] = useState("")
  const [mood, setMood] = useState<{ mood: string; emoji: string; label: string } | null>(null)
  const [moodLoading, setMoodLoading] = useState(true)
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const [tokenPanelOpen, setTokenPanelOpen] = useState(false)
  const [tokenData, setTokenData] = useState<{ date: string; total: number; input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number } | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)

  // 模块状态预览
  const [memoryCount, setMemoryCount] = useState<number | null>(null)
  const [scheduleTitle, setScheduleTitle] = useState<string | null>(null)

  // 里程碑倒数
  const [milestones, setMilestones] = useState<CalendarEntry[]>([])

  const daysTogether = calcDaysTogether()

  // 加载所有数据
  useEffect(() => {
    loadWeather()
    loadMood()
    loadMemoryCount()
    loadSchedule()
    loadMilestones()
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

  async function loadMood() {
    try {
      const data = await getMood()
      if (data.mood && data.emoji && data.label) {
        setMood({ mood: data.mood, emoji: data.emoji, label: data.label })
      }
    } catch {
      // 安静失败
    } finally {
      setMoodLoading(false)
    }
  }

  async function loadMemoryCount() {
    try {
      const data = await getMemoryIndex()
      setMemoryCount(data.count)
    } catch {
      // 安静失败
    }
  }

  async function loadSchedule() {
    try {
      const data = await getUpcomingCalendar(7)
      if (data.entries.length > 0) {
        setScheduleTitle(data.entries[0].title)
      } else {
        setScheduleTitle(null)
      }
    } catch {
      setScheduleTitle(null)
    }
  }

  async function loadMilestones() {
    try {
      const data = await getCalendarEntries()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const filtered = data.entries
        .filter(e => MILESTONE_TYPES.has(e.type))
        .map(e => {
          const d = new Date(e.date + "T00:00:00")
          const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          return { ...e, _days_from_now: diff }
        })
        .filter(e => e._days_from_now! >= 0 && e._days_from_now! <= 30)
        .sort((a, b) => a._days_from_now! - b._days_from_now!)
        .slice(0, 3)
      setMilestones(filtered)
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
        {/* ===== 标题区 ===== */}
        <div className="pt-5 pb-3">
          <h1
            className="font-['HongLei'] text-7xl leading-tight tracking-normal"
            style={{
              background: "linear-gradient(to right, #f5f0eb, #c4a87a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            归砚
          </h1>
          <div className="mt-1 mb-4 flex items-baseline gap-2">
            <span className="text-sm text-[#c4a87a]/80 font-['LXGW_WenKai']">与你，第</span>
            <span className="text-6xl font-serif text-[#c4a87a] leading-none tracking-wide">{daysTogether}</span>
            <span className="text-sm text-[#c4a87a]/80 font-['LXGW_WenKai']">天</span>
          </div>
        </div>

        {/* ===== 天气 + 时间 ===== */}
        <div className="mb-3 flex gap-3">
          {/* 左：天气 */}
          <div
            className="flex-1 rounded-2xl border p-3.5"
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
                    className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground focus:border-ring focus:outline-none"
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
                  className="group flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>{weatherCity ?? "城市"}</span>
                  <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
            <div className="text-base leading-tight">
              {weatherLoading ? "···" : weather ?? "—"}
            </div>
          </div>

          {/* 右：时间 */}
          <div
            className="flex-1 rounded-2xl border p-3.5"
            style={{
              backgroundColor: "var(--glass-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="text-[11px] text-muted-foreground/60">现在</div>
            <ClockWidget />
          </div>
        </div>

        {/* ===== 砚迟问候 ===== */}
        <div className="mb-3 text-sm text-muted-foreground/80">
          <span className="text-[#c4a87a]/70">{timeGreeting}，</span>
          <span className="italic">「{greeting}」</span>
        </div>

        {/* ===== 今天的心情 ===== */}
        <div className="mb-4 rounded-2xl border p-4" style={{ backgroundColor: "var(--glass-bg)", borderColor: "var(--glass-border)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {mood ? (
                <MoodIcon mood={mood.mood} className="h-5 w-5 text-[#c4a87a]" />
              ) : (
                <span className="text-lg">💭</span>
              )}
              <span className="text-sm text-foreground">
                {moodLoading ? "···" : mood ? `今天${MOOD_LABELS[mood.mood] || mood.label}` : "今天心情怎么样？"}
              </span>
            </div>
            <button
              onClick={() => setShowMoodPicker(!showMoodPicker)}
              className="rounded-lg px-2 py-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              {mood ? "换一个" : "点我"}
            </button>
          </div>

          {showMoodPicker && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {MOOD_OPTIONS.map((opt) => {
                const isSelected = mood?.mood === opt.mood
                return (
                  <button
                    key={opt.mood}
                    onClick={async () => {
                      setMood({ mood: opt.mood, emoji: opt.emoji, label: opt.label })
                      setShowMoodPicker(false)
                      try { await setMoodApi(opt.mood, opt.emoji, opt.label) } catch {}
                    }}
                    className="relative flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all duration-500 ease-out"
                    style={{
                      opacity: isSelected ? 1 : 0.65,
                      transform: isSelected ? "scale(1.08)" : "scale(1)",
                      boxShadow: isSelected ? "0 0 16px rgba(196,168,122,0.25)" : "none",
                    }}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 rounded-xl border border-[#c4a87a]/30" />
                    )}
                    <MoodIcon
                      mood={opt.mood}
                      className={cn(
                        "h-6 w-6 transition-colors duration-500 ease-out",
                        isSelected ? "text-[#c4a87a]" : "text-[#c4a87a]/70"
                      )}
                      style={{
                        animation: isSelected ? "breathe 2s ease-in-out infinite" : "none",
                      }}
                    />
                    <span className={cn(
                      "text-[10px] transition-colors duration-500 ease-out",
                      isSelected ? "text-[#c4a87a]" : "text-muted-foreground/70"
                    )}>
                      {MOOD_LABELS[opt.mood] || opt.label}
                    </span>
                    {isSelected && (
                      <span className="absolute -bottom-0.5 left-1/4 w-1/2 h-0.5 bg-[#c4a87a] rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ===== 里程碑倒数 ===== */}
        {milestones.length > 0 && (
          <div className="mb-4 rounded-2xl border p-4" style={{ backgroundColor: "var(--glass-bg)", borderColor: "var(--glass-border)" }}>
            <h2 className="mb-3 text-xs font-medium text-[#c4a87a]/80 tracking-wider uppercase">里程碑</h2>
            <div className="space-y-2.5">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{m.title}</span>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full",
                      m._days_from_now === 0
                        ? "bg-[#c4a87a]/20 text-[#c4a87a]"
                        : "bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {formatCountdown(m._days_from_now!)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 模块状态预览 ===== */}
        <div className="mt-2 space-y-2.5">
          {/* 聊天 */}
          <Link
            href="/chat"
            className="group block rounded-2xl border transition-all duration-500 ease-out hover:scale-[1.01]"
            style={{
              backgroundColor: "var(--glass-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#c4a87a20" }}>
                <MessageCircle className="h-5 w-5 text-[#c4a87a]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">聊天</h3>
                <p className="text-xs text-muted-foreground/70">开始对话</p>
              </div>
              <Sparkles className="h-4 w-4 text-[#c4a87a]/40 group-hover:text-[#c4a87a]/70 transition-colors duration-500 ease-out" />
            </div>
          </Link>

          {/* 记忆 */}
          <Link
            href="/memories"
            className="group block rounded-2xl border transition-all duration-500 ease-out hover:scale-[1.01]"
            style={{
              backgroundColor: "var(--glass-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#c4a87a20" }}>
                <BookMarked className="h-5 w-5 text-[#c4a87a]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">回忆</h3>
                <p className="text-xs text-muted-foreground/70">
                  {memoryCount !== null ? `${memoryCount} 条记忆` : "时间线 · 记忆库"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground/40">{memoryCount !== null ? "查看" : "···"}</span>
            </div>
          </Link>

          {/* 日程 */}
          <Link
            href="/memories"
            className="group block rounded-2xl border transition-all duration-500 ease-out hover:scale-[1.01]"
            style={{
              backgroundColor: "var(--glass-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#c4a87a20" }}>
                <Calendar className="h-5 w-5 text-[#c4a87a]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">日程</h3>
                <p className="text-xs text-muted-foreground/70">{scheduleTitle || "暂无日程"}</p>
              </div>
              <Calendar className="h-4 w-4 text-muted-foreground/30" />
            </div>
          </Link>
        </div>

        {/* ===== Token 用量折叠块 ===== */}
        <div className="mt-4">
          <button
            onClick={() => {
              setTokenPanelOpen(!tokenPanelOpen)
              if (!tokenData && !tokenLoading) {
                setTokenLoading(true)
                getTodayTokenUsage()
                  .then(setTokenData)
                  .catch(() => {})
                  .finally(() => setTokenLoading(false))
              }
            }}
            className="flex w-full items-center justify-between rounded-xl border border-border/50 px-4 py-2.5 text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/20 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              今日 Token 用量
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-500 ease-out", tokenPanelOpen && "rotate-180")} />
          </button>

          {tokenPanelOpen && (
            <div className="mt-2 rounded-xl border border-border/50 bg-card p-3 space-y-2">
              {tokenLoading ? (
                <div className="flex items-center justify-center py-2">
                  <div className="h-3 w-3 animate-spin rounded-full border border-[#c4a87a] border-t-transparent" />
                </div>
              ) : tokenData ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground/60">总计</span>
                    <span className="text-sm font-semibold text-foreground">{tokenData.total.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-border/50" />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground/60">↑ 输入</span>
                      <span className="text-foreground/80">{tokenData.input_tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground/60">↓ 输出</span>
                      <span className="text-foreground/80">{tokenData.output_tokens.toLocaleString()}</span>
                    </div>
                    {tokenData.cache_read_input_tokens > 0 && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground/60">📖 缓存读取</span>
                        <span className="text-green-500/80">{tokenData.cache_read_input_tokens.toLocaleString()}</span>
                      </div>
                    )}
                    {tokenData.cache_creation_input_tokens > 0 && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground/60">📦 缓存创建</span>
                        <span className="text-amber-500/80">{tokenData.cache_creation_input_tokens.toLocaleString()}</span>
                      </div>
                    )}
                    {tokenData.input_tokens > 0 && <div className="h-px bg-border/30" />}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground/60">🎯 缓存命中率</span>
                      <span className={cn(
                        "font-medium",
                        tokenData.input_tokens === 0 ? "text-muted-foreground/40" :
                        (tokenData.cache_read_input_tokens / (tokenData.input_tokens + tokenData.cache_read_input_tokens) * 100) >= 50 ? "text-green-500" :
                        (tokenData.cache_read_input_tokens / (tokenData.input_tokens + tokenData.cache_read_input_tokens) * 100) >= 20 ? "text-amber-500" : "text-muted-foreground/80"
                      )}>
                        {tokenData.input_tokens === 0
                          ? "—"
                          : `${(tokenData.cache_read_input_tokens / (tokenData.input_tokens + tokenData.cache_read_input_tokens) * 100).toFixed(1)}%`}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1 text-[10px] text-muted-foreground/40 text-center">
                    {tokenData.date}
                  </div>
                </>
              ) : (
                <div className="py-2 text-center text-xs text-muted-foreground/40">
                  加载失败
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pb-2 text-center text-xs text-muted-foreground/40">
        归砚 · 安静陪伴
      </div>
    </div>
  )
}

function ClockWidget() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const hh = now.getHours().toString().padStart(2, "0")
  const mm = now.getMinutes().toString().padStart(2, "0")
  const days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

  return (
    <>
      <div className="text-lg leading-tight tracking-wider">{hh}:{mm}</div>
      <div className="text-[11px] text-muted-foreground/50 mt-0.5">{days[now.getDay()]}</div>
    </>
  )
}


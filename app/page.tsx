"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { MessageCircle, BookMarked, PenSquare, Heart, Sparkles, Pencil, BarChart3, ChevronDown } from "lucide-react"
import { getHomeData, getSettings, updateSettings, getTodayTokenUsage, getMood, setMood as setMoodApi, MOOD_OPTIONS, type HomeData } from "@/lib/api"
import { cn } from "@/lib/utils"

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
  const [editingCity, setEditingCity] = useState(false)
  const [cityInput, setCityInput] = useState("")
  const [mood, setMood] = useState<{ emoji: string; label: string } | null>(null)
  const [moodLoading, setMoodLoading] = useState(true)
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const [tokenPanelOpen, setTokenPanelOpen] = useState(false)
  const [tokenData, setTokenData] = useState<{ date: string; total: number; input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number } | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)

  const daysTogether = calcDaysTogether()

  // 加载天气和今日心情
  useEffect(() => {
    loadWeather()
    loadMood()
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
      if (data.emoji && data.label) {
        setMood({ emoji: data.emoji, label: data.label })
      }
    } catch {
      // 安静失败
    } finally {
      setMoodLoading(false)
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
        <div className="mb-3 text-sm text-muted-foreground/80">
          <span className="text-amber-500/70">{timeGreeting}，</span>
          <span className="italic">「{greeting}」</span>
        </div>

        {/* 今天的心情 */}
        <div className="mb-3 rounded-2xl border p-4" style={{ backgroundColor: "var(--glass-bg)", borderColor: "var(--glass-border)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{mood?.emoji || "💭"}</span>
              <span className="text-sm text-foreground">
                {moodLoading ? "···" : mood ? `今天${mood.label}` : "今天心情怎么样？"}
              </span>
            </div>
            <button
              onClick={() => setShowMoodPicker(!showMoodPicker)}
              className="rounded-lg px-2 py-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              {mood ? "换一个" : "点我"}
            </button>
          </div>

          {/* 心情选择器 */}
          {showMoodPicker && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {MOOD_OPTIONS.map((opt) => (
                <button
                  key={opt.mood}
                  onClick={async () => {
                    setMood({ emoji: opt.emoji, label: opt.label })
                    setShowMoodPicker(false)
                    try { await setMoodApi(opt.mood, opt.emoji, opt.label) } catch {}
                  }}
                  className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-colors hover:bg-muted/40 ${
                    mood?.label === opt.label ? "bg-muted/30 ring-1 ring-[#c4a87a]/40" : ""
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className="text-[10px] text-muted-foreground/70">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

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

        {/* Token 用量折叠块 */}
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
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", tokenPanelOpen && "rotate-180")} />
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
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
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

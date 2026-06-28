"use client"

import { useEffect, useState } from "react"
import { Sun, Moon, Eye, EyeOff, ArrowLeft, Sparkles, Plus, Trash2, Check } from "lucide-react"
import { useTheme } from "@/components/theme/theme-provider"
import { getSettings, updateSettings, getAuList, createAu, activateAu, deleteAu } from "@/lib/api"
import type { Settings, AU } from "@/lib/types"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const MODELS = [
  { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
]

const QWEN_MODELS = [
  { value: "qwen-vl-max", label: "Qwen VL Max" },
  { value: "qwen-vl-plus", label: "Qwen VL Plus" },
  { value: "qwen2.5-vl-72b-instruct", label: "Qwen2.5 VL 72B" },
]

export default function SettingsPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [settings, setSettings] = useState<Settings>({
    api_key: "",
    base_url: "",
    model: MODELS[0].value,
    thinking_mode: false,
    theme: "dark",
    qwen_api_key: "",
    qwen_base_url: "",
    qwen_vl_model: QWEN_MODELS[0].value,
    weather_location: "",
  })
  const [showKey, setShowKey] = useState(false)
  const [showQwenKey, setShowQwenKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [keyEdited, setKeyEdited] = useState(false)
  const [qwenKeyEdited, setQwenKeyEdited] = useState(false)

  // AU 状态
  const [auList, setAuList] = useState<AU[]>([])
  const [auLoading, setAuLoading] = useState(false)
  const [showAuForm, setShowAuForm] = useState(false)
  const [auForm, setAuForm] = useState({ name: "", background: "", persona_override: "", tone_shift: "" })

  useEffect(() => {
    loadSettings()
    loadAuList()
  }, [])

  async function loadSettings() {
    try {
      const data = await getSettings()
      setSettings((prev) => ({ ...prev, ...data }))
    } catch {
      toast.error("加载设置失败，请检查后端是否运行")
    } finally {
      setLoading(false)
    }
  }

  async function loadAuList() {
    setAuLoading(true)
    try {
      const data = await getAuList()
      setAuList(data.aus)
    } catch {
      // 静默失败
    } finally {
      setAuLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { ...settings }
      if (typeof payload.api_key === "string" && payload.api_key.includes("...")) {
        payload.api_key = ""
      }
      if (typeof payload.qwen_api_key === "string" && payload.qwen_api_key.includes("...")) {
        payload.qwen_api_key = ""
      }
      await updateSettings(payload)
      toast.success("设置已保存")
      await loadSettings()
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  async function handleActivateAu(auId: string) {
    try {
      await activateAu(auId)
      toast.success("场景已切换")
      await loadAuList()
    } catch {
      toast.error("切换失败")
    }
  }

  async function handleDeleteAu(auId: string) {
    try {
      await deleteAu(auId)
      toast.success("已删除")
      await loadAuList()
    } catch {
      toast.error("删除失败")
    }
  }

  async function handleCreateAu() {
    if (!auForm.name.trim()) {
      toast.error("请输入 AU 名称")
      return
    }
    try {
      await createAu({
        name: auForm.name,
        background: auForm.background,
        persona_override: auForm.persona_override,
        tone_shift: auForm.tone_shift,
      })
      toast.success("AU 已创建")
      setShowAuForm(false)
      setAuForm({ name: "", background: "", persona_override: "", tone_shift: "" })
      await loadAuList()
    } catch {
      toast.error("创建失败")
    }
  }

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
      <div className="flex items-center gap-3 border-b border-border/50 px-4 pt-[env(safe-area-inset-top,12px)] pb-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

        {/* ── 场景切换 ─────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            场景切换
          </h2>
          <div className="space-y-2">
            {auList.length === 0 && auLoading && (
              <p className="text-xs text-muted-foreground">加载中...</p>
            )}
            {auList.map((au) => {
              const isDefault = au.id === "default"
              const isActive = au.active
              return (
                <div
                  key={au.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                    isActive
                      ? "border-[#c4a87a]/60 bg-[#c4a87a]/5"
                      : "border-input bg-background"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isActive ? (
                      <Check className="h-4 w-4 shrink-0 text-[#c4a87a]" />
                    ) : (
                      <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <div className="min-w-0">
                      <span className="text-sm text-foreground">{au.name}</span>
                      {isDefault && (
                        <span className="ml-2 text-[10px] text-muted-foreground">默认</span>
                      )}
                      {!isDefault && au.persona_override && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {au.persona_override}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {!isDefault && !isActive && (
                      <button
                        onClick={() => handleActivateAu(au.id)}
                        className="rounded-md px-2 py-1 text-[11px] text-[#c4a87a] hover:bg-[#c4a87a]/10 transition-colors"
                      >
                        激活
                      </button>
                    )}
                    {!isDefault && (
                      <button
                        onClick={() => handleDeleteAu(au.id)}
                        className="rounded-md p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 新增 AU 表单 */}
          {showAuForm ? (
            <div className="mt-3 space-y-2 rounded-lg border border-input bg-background p-3">
              <input
                type="text"
                value={auForm.name}
                onChange={(e) => setAuForm({ ...auForm, name: e.target.value })}
                placeholder="AU 名称（如：古风江湖、现代校园）"
                className="w-full rounded-md border border-input bg-muted/30 px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
              />
              <textarea
                value={auForm.background}
                onChange={(e) => setAuForm({ ...auForm, background: e.target.value })}
                placeholder="世界观/背景（可选）"
                rows={2}
                className="w-full rounded-md border border-input bg-muted/30 px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none resize-none"
              />
              <textarea
                value={auForm.persona_override}
                onChange={(e) => setAuForm({ ...auForm, persona_override: e.target.value })}
                placeholder="你是谁 + 和乐乐的关系（可选）"
                rows={2}
                className="w-full rounded-md border border-input bg-muted/30 px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none resize-none"
              />
              <textarea
                value={auForm.tone_shift}
                onChange={(e) => setAuForm({ ...auForm, tone_shift: e.target.value })}
                placeholder="语气微调（可选）"
                rows={2}
                className="w-full rounded-md border border-input bg-muted/30 px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateAu}
                  className="flex-1 rounded-md bg-[#c4a87a] py-1.5 text-xs font-medium text-white hover:bg-[#b8986a] transition-colors"
                >
                  创建
                </button>
                <button
                  onClick={() => { setShowAuForm(false); setAuForm({ name: "", background: "", persona_override: "", tone_shift: "" }) }}
                  className="rounded-md border border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAuForm(true)}
              className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              新增场景
            </button>
          )}
        </section>

        {/* API 配置 */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">API 配置</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">API 地址</label>
              <input
                type="url"
                value={settings.base_url}
                onChange={(e) => setSettings({ ...settings, base_url: e.target.value })}
                placeholder="https://api.deepseek.com/anthropic"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.api_key || ""}
                  onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 模型选择 */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">模型</h2>
          <select
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </section>

        {/* 天气城市 */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">天气城市</h2>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">城市名称（用于首页天气显示）</label>
            <input
              type="text"
              value={settings.weather_location || ""}
              onChange={(e) => setSettings({ ...settings, weather_location: e.target.value })}
              placeholder="例如：上海、北京… 留空自动定位"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
            />
          </div>
        </section>

        {/* 思考模式 */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">思考模式</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.thinking_mode}
                onChange={(e) =>
                  setSettings({ ...settings, thinking_mode: e.target.checked })
                }
                className="sr-only"
              />
              <div
                className={`h-5 w-9 rounded-full transition-colors ${
                  settings.thinking_mode ? "bg-[#c4a87a]" : "bg-muted"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full bg-white transition-transform ${
                    settings.thinking_mode ? "translate-x-[18px]" : "translate-x-0.5"
                  } mt-0.5 shadow-sm`}
                />
              </div>
            </div>
            <span className="text-sm text-foreground">显示思考链</span>
          </label>
        </section>

        {/* 千问配置（图片识别） */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">千问 VL（图片识别）</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">API 密钥</label>
              <div className="relative">
                <input
                  type={showQwenKey ? "text" : "password"}
                  value={settings.qwen_api_key || ""}
                  onChange={(e) => setSettings({ ...settings, qwen_api_key: e.target.value })}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
                />
                <button
                  onClick={() => setShowQwenKey(!showQwenKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showQwenKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">接口地址</label>
              <input
                type="url"
                value={settings.qwen_base_url}
                onChange={(e) => setSettings({ ...settings, qwen_base_url: e.target.value })}
                placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">模型</label>
              <select
                value={settings.qwen_vl_model}
                onChange={(e) => setSettings({ ...settings, qwen_vl_model: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
              >
                {QWEN_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 主题 */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">主题</h2>
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-[#c4a87a]" />
              ) : (
                <Sun className="h-4 w-4 text-[#c4a87a]" />
              )}
              {theme === "dark" ? "暗色模式" : "亮色模式"}
            </span>
            <span className="text-xs text-muted-foreground">点击切换</span>
          </button>
        </section>

        {/* 保存按钮 */}
        <div className="sticky bottom-0 pt-3 pb-1 bg-background/90 backdrop-blur-sm">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-lg bg-[#c4a87a] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#b8986a] disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存设置"}
          </button>
        </div>
      </div>
    </div>
  )
}

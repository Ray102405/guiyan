"use client"

import { useEffect, useState } from "react"
import { Sun, Moon, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { useTheme } from "@/components/theme/theme-provider"
import { getSettings, updateSettings } from "@/lib/api"
import type { Settings } from "@/lib/types"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const MODELS = [
  { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
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
  })
  const [showKey, setShowKey] = useState(false)
  const [showQwenKey, setShowQwenKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [keyEdited, setKeyEdited] = useState(false)
  const [qwenKeyEdited, setQwenKeyEdited] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const data = await getSettings()
      // 合并后端数据与默认值，避免 undefined 导致 uncontrolled input 警告
      setSettings((prev) => ({ ...prev, ...data }))
    } catch {
      toast.error("加载设置失败，请检查后端是否运行")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      // 过滤掉脱敏的 key（避免把 "sk-dd33d...914f" 这种存回去）
      const payload = { ...settings }
      if (payload.api_key && payload.api_key.includes("...")) {
        payload.api_key = ""
      }
      if (payload.qwen_api_key && payload.qwen_api_key.includes("...")) {
        payload.qwen_api_key = ""
      }
      await updateSettings(payload)
      toast.success("设置已保存")
      // 重新加载以获取脱敏后的显示
      await loadSettings()
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
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
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
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
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-[#c4a87a] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#b8986a] disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存设置"}
        </button>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState, useRef } from "react"
import type { Message as MessageType } from "@/lib/types"
import { ThinkingBlock } from "./thinking-block"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const AVATAR_API = "/backend"

function getStoredAvatar(type: "ai" | "user"): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem("avatar_" + type)
  } catch {
    return null
  }
}

function AvatarImage({ type, onRefresh }: { type: "ai" | "user"; onRefresh?: () => void }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAvatarUrl(getStoredAvatar(type))
  }, [type])

  const handleClick = () => fileRef.current?.click()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      localStorage.setItem("avatar_" + type, dataUrl)
      setAvatarUrl(dataUrl)
      try {
        await fetch(`${AVATAR_API}/api/avatar/${type}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: dataUrl }),
        })
      } catch {}
      onRefresh?.()
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    localStorage.removeItem("avatar_" + type)
    setAvatarUrl(null)
    onRefresh?.()
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs font-medium select-none overflow-hidden transition-opacity hover:opacity-80",
          type === "user" ? "bg-[#c4a87a] text-white" : "bg-muted text-muted-foreground"
        )}
        title={type === "ai" ? "点击换砚迟头像 · 右键重置" : "点击换你头像 · 右键重置"}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          type === "ai" ? "砚" : "乐"
        )}
      </div>
    </>
  )
}

interface MessageProps {
  message: MessageType
  isStreaming?: boolean
  onDelete?: (id: string) => void
  showImage?: boolean
}

export function Message({ message, isStreaming, onDelete }: MessageProps) {
  const isUser = message.role === "user"
  const [, refreshKey] = useState(0)
  const [ctxMenu, setCtxMenu] = useState(false)
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 })
  const msgId = message.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const forceRefresh = () => refreshKey((k) => k + 1)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setCtxPos({ x: e.clientX, y: e.clientY })
    setCtxMenu(true)
  }

  const handleDelete = () => {
    setCtxMenu(false)
    onDelete?.(msgId)
  }

  // 点击其他地方关闭右键菜单
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(false)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [ctxMenu])

  return (
    <div
      className={cn("flex items-start gap-3 group", isUser ? "flex-row-reverse" : "flex-row")}
      onContextMenu={handleContextMenu}
    >
      <AvatarImage type={isUser ? "user" : "ai"} onRefresh={forceRefresh} />

      <div className={cn("max-w-[80%] space-y-1", isUser && "items-end flex flex-col")}>
        {message.thinking && !isUser && (
          <div className={isUser ? "hidden" : ""}>
            <ThinkingBlock content={message.thinking} isStreaming={isStreaming} />
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isUser
              ? "bg-[#c4a87a]/10 text-foreground rounded-br-md"
              : "glass text-foreground rounded-bl-md"
          )}
        >
          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {message.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  className="max-h-32 rounded-lg object-cover border border-border/30"
                />
              ))}
            </div>
          )}
          {message.content.trim()}
          {isStreaming && !isUser && <span className="ml-0.5 animate-pulse">|</span>}
        </div>

        {(message.timestamp || message.tokens) && (
          <span
            className={cn(
              "text-[10px] text-muted-foreground/60 px-1",
              isUser && "text-right"
            )}
          >
            {message.timestamp && format(new Date(message.timestamp), "HH:mm")}
            {message.tokens && (
              <span className="ml-1.5">
                {(() => {
                  const tk = message.tokens!
                  const inp = tk.input_tokens ?? tk.prompt_tokens ?? 0
                  const out = tk.output_tokens ?? tk.completion_tokens ?? 0
                  const cr = tk.cache_read_input_tokens ?? tk.prompt_cache_hit_tokens ?? 0
                  const cc = tk.cache_creation_input_tokens ?? tk.prompt_cache_miss_tokens ?? 0
                  return <span>↑{inp} · ↓{out}{(cc > 0 && <span> · 缓存创建 {cc}</span>)}{(cr > 0 && <span> · 缓存读取 {cr}</span>)}{(cr > 0 && inp > 0 && <span className="text-green-500/70"> ({((cr / (inp + cr)) * 100).toFixed(1)}%)</span>)}</span>
                })()}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Delete button (on hover) */}
      {!isStreaming && onDelete && (
        <button
          onClick={handleDelete}
          className="self-center opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
          title="删除消息"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 min-w-[120px] rounded-lg border border-border bg-card py-1 shadow-lg"
          style={{ left: ctxPos.x, top: ctxPos.y }}
        >
          <button
            onClick={handleDelete}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
          >
            🗑 删除消息
          </button>
        </div>
      )}
    </div>
  )
}

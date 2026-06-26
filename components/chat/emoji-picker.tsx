"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

const EMOJIS = [
  "😊", "😂", "🥰", "😍", "😘", "😌", "😏", "🥺",
  "😭", "😤", "😡", "🤯", "😳", "🥹", "😅", "🤣",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "✨", "🌟", "⭐", "💫", "🔥", "💯", "✅", "❌",
  "👍", "👎", "👏", "🙌", "🤝", "💪", "🫶", "🤗",
  "🌙", "☀️", "🌊", "🌸", "🍃", "🌺", "🪷", "🌿",
  "🐱", "🐶", "🦊", "🐰", "🐼", "🐲", "🦋", "🐝",
  "🎵", "🎶", "🎤", "🎧", "📖", "☕", "🍵", "🎨",
]

const CATEGORIES = [
  { label: "表情", range: [0, 15] },
  { label: "爱心", range: [16, 23] },
  { label: "符号", range: [24, 31] },
  { label: "手势", range: [32, 39] },
  { label: "自然", range: [40, 47] },
  { label: "动物", range: [48, 55] },
  { label: "物品", range: [56, 63] },
] as const

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [cat, setCat] = useState(0)

  const currentRange = CATEGORIES[cat].range
  const visibleEmojis = EMOJIS.slice(currentRange[0], currentRange[1] + 1)

  return (
    <div className="absolute bottom-16 left-0 z-50 w-[280px] rounded-2xl border bg-card shadow-xl">
      {/* Categories */}
      <div className="flex gap-0.5 border-b border-border/50 px-2 py-1.5 overflow-x-auto">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.label}
            onClick={() => setCat(i)}
            className={cn(
              "shrink-0 rounded-lg px-2 py-1 text-xs transition-colors",
              cat === i
                ? "bg-[#c4a87a]/10 text-[#c4a87a]"
                : "text-muted-foreground/60 hover:text-foreground"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0.5 p-2">
        {visibleEmojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose() }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-muted transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Lightbulb, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThinkingBlockProps {
  content: string
  isStreaming?: boolean
}

export function ThinkingBlock({ content, isStreaming }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(true)

  if (!content) return null

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
      >
        <Lightbulb className="h-3.5 w-3.5 text-[#c4a87a]" />
        <span>思考链</span>
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {isStreaming && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c4a87a] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c4a87a]" />
          </span>
        )}
      </button>
      {expanded && (
        <div className="mt-2 rounded-lg border border-border/30 bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
          {content}
          {isStreaming && <span className="ml-0.5 animate-pulse">|</span>}
        </div>
      )}
    </div>
  )
}

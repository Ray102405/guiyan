"use client"

import { MessageCircle, BookMarked, PenSquare } from "lucide-react"
import { ModuleCard } from "@/components/home/module-card"

export default function HomePage() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          归砚
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          安静的私密聊天空间
        </p>
      </div>

      {/* Modules */}
      <div className="flex-1 space-y-3 px-6">
        <ModuleCard
          href="/chat"
          title="聊天"
          description="和砚迟说话，有思考链、对话存档、自动记忆"
          icon={MessageCircle}
        />
        <ModuleCard
          href="/memories"
          title="回忆"
          description="精选事件时间线，回顾那些值得记住的瞬间"
          icon={BookMarked}
          accent="#888"
        />
        <ModuleCard
          href="/settings"
          title="设置"
          description="API 配置、模型选择、主题切换"
          icon={PenSquare}
          accent="#666"
        />
      </div>

      {/* Footer hint */}
      <div className="px-6 pb-4 pt-8 text-center text-xs text-muted-foreground/40">
        归砚 · 安静陪伴
      </div>
    </div>
  )
}

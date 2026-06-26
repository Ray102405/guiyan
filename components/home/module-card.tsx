"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"

interface ModuleCardProps {
  href: string
  title: string
  description: string
  icon: LucideIcon
  accent?: string
}

export function ModuleCard({ href, title, description, icon: Icon, accent }: ModuleCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border backdrop-blur-2xl transition-all duration-300 hover:scale-[1.02]"
      style={{
        backgroundColor: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
        boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.08), inset 0 -0.5px 0 rgba(135,206,235,0.04), 0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-start gap-4 p-6">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent || "#c4a87a"}20` }}
        >
          <Icon
            className="h-6 w-6"
            style={{ color: accent || "#c4a87a" }}
          />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground/80 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}

"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, MessageCircle, BookMarked, BookOpen, Settings } from "lucide-react"

const items = [
  { href: "/", label: "首页", icon: Home },
  { href: "/chat", label: "聊天", icon: MessageCircle },
  { href: "/books", label: "书架", icon: BookOpen },
  { href: "/memories", label: "回忆", icon: BookMarked },
  { href: "/settings", label: "设置", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="glass-nav shrink-0 border-t pb-safe-bottom">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors"
            >
              <Icon
                className={`h-5 w-5 ${
                  isActive ? "text-[#c4a87a]" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-[#c4a87a]" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

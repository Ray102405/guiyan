"use client"

import { useEffect, useState } from "react"

export function PwaInstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // 已经以 standalone 模式运行（已安装 PWA）→ 不显示
    if (window.matchMedia("(display-mode: standalone)").matches) return

    // 已通过 iOS Safari 添加到主屏幕 → 不显示
    if ((window.navigator as any).standalone) return

    // Chrome 安装弹窗拦截
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener("beforeinstallprompt", handler)

    // 非 Chrome 浏览器：展示手动安装提示
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    if (isMobile && !/Chrome/i.test(navigator.userAgent)) {
      // 延迟显示，等页面加载完
      const timer = setTimeout(() => setShow(true), 5000)
      return () => clearTimeout(timer)
    }

    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === "accepted") setShow(false)
      setDeferredPrompt(null)
    }
  }

  if (!show) return null

  return (
    <div className="fixed bottom-28 left-4 right-4 z-50 mx-auto max-w-lg animate-in slide-in-from-bottom-4 fade-in">
      <div className="rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-[#c4a87a]/20 flex items-center justify-center text-sm">
            ✦
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">安装归砚</p>
            <p className="mt-0.5 text-xs text-muted-foreground/70 leading-relaxed">
              {deferredPrompt
                ? "添加到主屏幕，获得无地址栏的沉浸体验"
                : /iPad|iPhone|iP/.test(navigator.userAgent)
                  ? "点分享按钮 → 添加到主屏幕"
                  : "点菜单 → 添加到主屏幕"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {deferredPrompt && (
              <button
                onClick={handleInstall}
                className="rounded-lg bg-[#c4a87a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#b89a6c] transition-colors"
              >
                安装
              </button>
            )}
            <button
              onClick={() => setShow(false)}
              className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

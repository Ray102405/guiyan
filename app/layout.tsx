import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { PwaInstallPrompt } from "@/components/pwa/install-prompt"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "归砚",
  description: "安静的私密聊天空间",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "归砚",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { url: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#111108",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="dark h-full" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS 全屏 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="归砚" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512.png" />
        <link href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css" rel="stylesheet"/>
        <style>{`@font-face{font-family:'HongLei';src:url('/fonts/鸿雷板书简体2.000.ttf') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}`}</style>
      </head>
      <body className="h-full antialiased">
        {/* Service Worker 注册 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator) {
                window.addEventListener("load", () => {
                  navigator.serviceWorker.register("/sw.js")
                })
              }
            `,
          }}
        />
        <ThemeProvider>
          <div className="relative mx-auto flex h-full max-w-lg flex-col">
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
            <BottomNav />
          </div>
          <PwaInstallPrompt />
          <Toaster
            position="top-center"
            toastOptions={{
              className: "!border-border !bg-card !text-card-foreground !shadow-lg",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}

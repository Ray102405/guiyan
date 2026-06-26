import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "归砚",
  description: "安静的私密聊天空间",
  appleWebApp: {
    capable: true,
    title: "归砚",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0d0d0d",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="dark h-full" suppressHydrationWarning>
      <body className="h-full antialiased">
        <ThemeProvider>
          <div className="relative mx-auto flex h-full max-w-lg flex-col pb-16">
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
            <BottomNav />
          </div>
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

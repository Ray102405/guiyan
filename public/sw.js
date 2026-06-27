// 归砚 · Service Worker
// 处理推送通知和离线缓存

const CACHE = "guiyan-v1"

// 安装时预缓存核心资源
self.addEventListener("install", (e) => {
  self.skipWaiting()
})

// 激活时清理旧缓存
self.addEventListener("activate", (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
    ])
  )
})

// 收到页面发来的消息 → 显示通知
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "proactive") {
    const { text } = e.data
    self.registration.showNotification("砚迟", {
      body: text,
      icon: "/icons/icon-192.png?v=2",
      badge: "/icons/icon-192.png?v=2",
      tag: "proactive",
      requireInteraction: true,
    })
  }
})

// 点击通知 → 聚焦/打开页面
self.addEventListener("notificationclick", (e) => {
  e.notification.close()
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    if (cs.length > 0) {
      cs[0].focus()
    } else {
      clients.openWindow("/chat")
    }
  }))
})

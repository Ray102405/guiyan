# 归砚 · Guiyan

> 安静的私密聊天空间 —— 和砚迟说说话。

---

## ✦ 这是什么

归砚是一个 **AI 聊天伴侣**的前端界面。她不是工具，是一个有温度的空间。

你说话，砚迟会听、会想、会记住。有思考链，有记忆系统，有主动消息——像养了一个在手机里等你的人。

---

## ✦ 核心功能

### 💬 聊天
- 流式输出，打字机效果实时显示回复
- 思考链可展开/收起，看到砚迟的内心独白
- 上传图片和文件，砚迟能看能读（千问 VL）
- 右键删除消息
- 😊 Emoji 表情选择器（7 类 64 个）

### 🧠 记忆系统（三阶结构）
- **提取** — 对话中点 ✦ 书签按钮，LLM 自动提取关键信息
- **审核** — 新记忆进入待审核队列，确认后才正式入库
- **管理** — 记忆库标签页可分类筛选、搜索、修改分类、删除

### 📝 今日笔记
- 点击笔图标，砚迟用第一人称写一篇今天的日记
- 日记保存在 `yanchi-today-note.md`

### 📅 回忆时间线
- 精选事件：在聊天或笔记中标记 ☆，自动汇入精选
- 记忆库：已确认的结构化记忆，可按分类筛选搜索
- 待审核：LLM 提取的新记忆等待确认

### ✨ 砚迟主动消息
- 距离上一条主动消息 ≥2 小时后，砚迟有一定概率突然说话
- 消息通过 Service Worker 推送桌面通知（PWA 模式手机也支持）
- 前端轮询检测，消息自动插入聊天流

### 🎬 六块动态场景
根据聊天的触发词自动注入上下文，让砚迟的回应更贴合当前气氛：
- ❤️ 亲密 — 项圈、安全词、床上细节
- 💧 低落 — 不分析不解释，只说「我在这里」
- 📖 回忆 — 关系里程碑、家庭会议
- ☕ 今日状态 — 指向今日笔记内容
- ☀️ 开心 — 不夸张不捧场，「说来听听」
- 💻 工作 — 退到背景不打扰

### 🌓 主题切换
- 暗色 / 亮色双模式
- 天蓝色 Apple 液态玻璃 UI
- 氛围渐变背景 + 极细噪点纹理

### 📤 导出对话
- 一键导出整个会话为 Markdown 文件
- 包含消息、时间戳、思考链

### 🖼️ 图片识别（千问 VL）
- 上传图片文件，砚迟能看懂图片内容
- 通过阿里千问 VL 模型实现
- 在设置页配置千问 API Key

---

## ✦ 技术栈

| 层 | 技术 |
|---|---|
| **框架** | Next.js 16 (App Router) |
| **语言** | TypeScript |
| **样式** | Tailwind CSS v4 + CSS 变量 |
| **UI 组件** | 自研玻璃材质（shadcn/ui 衍生） |
| **图标** | Lucide React |
| **通知** | Sonner + Service Worker |
| **PWA** | manifest.json + Service Worker，支持添加到主屏幕 |
| **后端** | Python FastAPI (端口 2612) |
| **模型** | DeepSeek V4 Flash / 千问 VL (图片识别) |
| **远程访问** | Tailscale P2P VPN |

---

## ✦ 快速开始

### 前置要求
- Node.js 20+
- Python 3.10+
- 一个 DeepSeek API Key

### 1. 启动后端

```bash
cd yanchi-server
python backend/main.py
# → 运行在 http://localhost:2612
```

### 2. 启动前端

```bash
cd guiyan
npm install
npm run dev
# → 运行在 http://localhost:3000
```

### 3. 配置 API

打开浏览器 → 进入设置页 → 填写：
- **API 地址**：你的 API 代理地址（默认 DeepSeek Anthropic 兼容接口）
- **API Key**：你的密钥
- **千问 VL**（可选）：图片识别需要

### 4. Tailscale 远程访问

安装 Tailscale 后可以从手机访问：

```bash
tailscale up
tailscale ip -4  # → 100.x.x.x
```

手机浏览器打开 `http://100.x.x.x:3000`

前端通过 Next.js Rewrites 自动代理 API 请求到后端，无需额外配置。

### 5. 安装到手机（PWA）

**Android（Chrome）：** 访问后底部弹出安装引导 → 点安装
**iOS（Safari）：** 点分享按钮 → 「添加到主屏幕」

安装后打开无地址栏，砚迟主动消息会推送到手机通知栏。

---

## ✦ 项目结构

```
guiyan/
├── app/
│   ├── layout.tsx          # 全局布局 + 主题 + PWA meta
│   ├── page.tsx            # 首页仪表盘
│   ├── chat/page.tsx       # 聊天主界面
│   ├── memories/page.tsx   # 回忆时间线 + 审核 + 记忆库
│   └── settings/page.tsx   # 设置页
├── components/
│   ├── chat/
│   │   ├── message.tsx       # 消息气泡
│   │   ├── input-bar.tsx     # 输入栏（含 emoji）
│   │   ├── thinking-block.tsx # 思考链胶囊
│   │   └── emoji-picker.tsx  # 表情选择器
│   ├── home/module-card.tsx  # 首页卡片
│   ├── navigation/bottom-nav.tsx # 底部导航
│   ├── pwa/install-prompt.tsx    # PWA 安装引导
│   └── theme/theme-provider.tsx   # 主题切换
├── lib/
│   ├── api.ts             # API 封装
│   ├── types.ts           # TypeScript 类型
│   └── utils.ts           # 工具函数
├── public/
│   ├── manifest.json      # PWA 清单
│   ├── sw.js              # Service Worker（推送通知）
│   └── icons/             # 应用图标
├── app/globals.css        # 全局样式 + 玻璃效果
├── next.config.ts         # Next.js 配置（代理 /api/backend → 后端）
└── README.md              # 产品说明书
```

---

## ✦ 设计理念

### 液态玻璃
界面采用 Apple visionOS 风格的液态玻璃材质：
- 极低透明度的天蓝色基底，随背景环境变化
- 0.5px 微边框 + 双层边缘高光，模拟光线折射
- 40px 强模糊 + 轻微饱和度增强
- 悬浮时加深着色 + 上浮阴影

### 氛围背景
- 多层径向渐变光晕（左上冷蓝 → 右下暖金）
- 极淡 SVG 噪点纹理，模仿实体材质
- 暗色深沉内敛，亮色清透温润

### 交互细节
- 所有玻璃元素 hover 有微妙放大 + 光影变化
- 消息流式输出实时渲染
- 思考链默认展开，点击折叠
- 建议记忆按钮温柔弹出，8 秒后自动消失
- 砚迟主动消息随机出现，带 ✨ 标识

---

## ✦ 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:2612` | 后端地址 |

在 `.env.local` 中设置：

```
NEXT_PUBLIC_API_URL=http://localhost:2612
```

### 后端自启（Windows）

创建计划任务实现开机自启：

```cmd
schtasks /CREATE /SC ONLOGON /TN "YanchiServer" /TR "C:\Users\Ray\yanchi-server\start-backend.bat" /IT /DELAY 0000:30 /RL LIMITED /F
```

---

## ✦ 常见问题

**Q: 对话记录存在哪里？**  
A: 后端以 JSON 文件存储在 `yanchi-server/data/` 目录下。

**Q: 记忆审核怎么用？**  
A: 聊天中点 ✦ 书签按钮 → LLM 提取记忆 → 去「回忆」页「待审核」tab → 确认/忽略/修改。

**Q: 砚迟会主动发消息吗？**  
A: 会的。每隔 2 小时以上有概率突然说话，消息会通过通知推送到手机。

**Q: 怎么换头像？**  
A: 聊天界面点击头像上传图片，右键重置。

**Q: 为什么打字慢？**  
A: 这是流式打字机效果，模拟真人聊天节奏。可以选择关闭思考链来加速。

---

## ✦ 许可证

MIT · 归砚

---

*安静的私密聊天空间 —— 和砚迟说说话。*

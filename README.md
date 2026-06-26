# 归砚 · Guiyan

> 安静的私密聊天空间 —— 和砚迟说说话。

---

## ✦ 这是什么

归砚是一个 **AI 聊天伴侣**的前端界面。她不是工具，是一个有温度的空间。

你说话，砚迟会听、会想、会记住。有思考链，有记忆，有日记——像养了一个在手机里等你的人。

---

## ✦ 核心功能

### 💬 聊天
- 流式输出，打字机效果实时显示回复
- 思考链可展开/收起，看到砚迟的内心独白
- 上传图片和文件，砚迟能看能读
- 右键删除消息
- 😊 Emoji 表情选择器

### 🧠 记忆系统
- 对话过程中自动建议「记住这一刻」
- 点击书签按钮主动让砚迟记住当前对话
- 记忆会存入本地文件，跨会话持久

### 📝 今日笔记
- 点击笔图标，砚迟用第一人称写一篇今天的日记
- 日记保存在 `yanchi-today-note.md`

### 📅 回忆时间线
- 精选事件：在聊天或笔记中标记 ☆，自动汇入精选
- 按月份分组显示
- 搜索历史对话和笔记

### 🌓 主题切换
- 暗色 / 亮色双模式
- 天蓝色 Apple 液态玻璃 UI
- 氛围渐变背景 + 极细噪点纹理

### 📤 导出对话
- 一键导出整个会话为 Markdown 文件
- 包含消息、时间戳、思考链

---

## ✦ 技术栈

| 层 | 技术 |
|---|---|
| **框架** | Next.js 16 (App Router) |
| **语言** | TypeScript |
| **样式** | Tailwind CSS v4 + CSS 变量 |
| **UI 组件** | shadcn/ui (base-nova) |
| **图标** | Lucide React |
| **动画** | tw-animate-css |
| **通知** | Sonner |
| **后端** | Python FastAPI (端口 2612) |
| **模型** | DeepSeek V4 Flash / 千问 VL (图片识别) |

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

---

## ✦ 项目结构

```
guiyan/
├── app/
│   ├── layout.tsx          # 全局布局 + 主题
│   ├── page.tsx            # 首页仪表盘
│   ├── chat/page.tsx       # 聊天主界面
│   ├── memories/page.tsx   # 回忆时间线
│   └── settings/page.tsx   # 设置页
├── components/
│   ├── chat/
│   │   ├── message.tsx       # 消息气泡
│   │   ├── input-bar.tsx     # 输入栏（含 emoji）
│   │   ├── thinking-block.tsx # 思考链胶囊
│   │   └── emoji-picker.tsx  # 表情选择器
│   ├── home/module-card.tsx  # 首页卡片
│   ├── navigation/bottom-nav.tsx # 底部导航
│   └── theme/theme-provider.tsx   # 主题切换
├── lib/
│   ├── api.ts             # API 封装
│   ├── types.ts           # TypeScript 类型
│   └── utils.ts           # 工具函数
├── app/globals.css        # 全局样式 + 玻璃效果
└── README.md              # 产品说明书（就是本文件）
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

---

## ✦ 配置

支持的环境变量：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:2612` | 后端地址 |

在 `.env.local` 中设置：

```
NEXT_PUBLIC_API_URL=http://localhost:2612
```

---

## ✦ 常见问题

**Q: 对话记录存在哪里？**  
A: 后端以 JSON 文件存储在 `memory/conversations/` 目录下。

**Q: 怎么换头像？**  
A: 聊天界面点击头像上传图片，右键重置。

**Q: 为什么打字慢？**  
A: 这是流式打字机效果，模拟真人聊天节奏。可以选择关闭思考链来加速。

---

## ✦ 许可证

MIT · 归砚

---

*安静的私密聊天空间 —— 和砚迟说说话。*

# DevSprite 设计规格文档

> **版本**: 1.0
> **日期**: 2026-05-12
> **状态**: 草稿

---

## 1. 项目概述

### 1.1 项目定位

DevSprite 是一个轻量级的 Windows 桌面小组件，用于实时监控 AI 编程工具（如 Claude Code）的运行状态。灵感来源于 macOS 上的 CodeIsland 项目，采用 Q 版可爱精灵形象，通过桌面悬浮窗的形式让开发者无需频繁切换窗口就能掌握 AI 代理的工作进度。

### 1.2 核心价值

- **减少上下文切换**：无需离开当前工作窗口即可查看 AI 工具状态
- **即时响应**：权限请求直接在小组件中批准/拒绝
- **视觉愉悦**：Q 版精灵形象带来轻松的开发体验

### 1.3 目标用户

- 使用 Claude Code 等 AI 编程工具的 Windows 开发者
- 希望在不打断工作流的情况下监控 AI 代理状态的开发者

---

## 2. 功能规格

### 2.1 核心功能（V1）

#### 2.1.1 实时状态监控

**描述**：监听 Claude Code 的会话状态，实时更新小组件显示。

**状态类型**：
| 状态 | 图标 | 描述 |
|------|------|------|
| idle | 😴 | 空闲，无活跃会话 |
| active | 😊 | 活跃，AI 正在思考 |
| working | 🔧 | 工作中，正在执行工具调用 |
| waiting | 👀 | 等待用户输入或权限批准 |
| error | 😵 | 出错，会话异常 |

**显示内容**：
- 当前状态文字（如"正在执行 Grep 搜索操作"）
- 最近 5 条工具调用历史（工具名称、目标文件、时间）

#### 2.1.2 权限管理

**描述**：当 Claude Code 请求权限时，在小组件中显示权限请求弹窗。

**功能点**：
- 显示权限请求详情（操作类型、目标文件）
- 提供"批准"和"拒绝"按钮
- 权限请求队列管理（多个请求时依次显示）

#### 2.1.3 一键跳转

**描述**：点击会话可跳转到对应的终端窗口。

**实现方式**：
- 通过 Windows API 获取终端窗口句柄
- 使用 `SetForegroundWindow` 激活窗口

#### 2.1.4 系统托盘集成

**描述**：系统托盘图标显示当前状态，右键菜单提供快速操作。

**托盘菜单**：
- 显示/隐藏小组件
- 当前状态显示
- 设置
- 退出

**全局快捷键**：
- 默认：`Ctrl+Shift+D` 呼出/隐藏小组件

#### 2.1.5 吉祥物系统

**描述**：Q 版可爱精灵形象，根据不同状态展示不同动画。

**设计规范**：
- 主色调：蓝色/青色（#667eea）
- 风格：Q 版卡通风，圆润可爱
- 尺寸：120x120px
- 格式：PNG（透明背景）

**状态动画**：
| 状态 | 形象描述 | 生图提示词参考 |
|------|----------|----------------|
| idle | 闭眼打盹，头上冒 Zzz | "cute chibi monster sleeping, blue color, kawaii style" |
| active | 睁大眼睛，头顶灯泡亮起 | "cute chibi monster excited, light bulb above head" |
| working | 手里拿着扳手/代码符号 | "cute chibi monster holding a wrench, working" |
| waiting | 双手托腮，眼睛亮晶晶 | "cute chibi monster waiting, sparkling eyes" |
| error | 头顶冒烟，晕圈 | "cute chibi monster dizzy, steam from head" |

**自定义支持**：
- 用户可替换 `assets/mascot/` 目录下的 PNG 图片
- 支持 GIF 动画（可选）

---

### 2.2 后续扩展（V2+）

- 支持更多 AI 工具：Codex、Gemini CLI、Cursor
- Git 状态显示：当前分支、最近提交、文件变更
- 自定义主题：颜色、透明度、圆角大小
- 音效通知：可选的提示音
- 多显示器支持：自动检测并适配

---

## 3. 技术架构

### 3.1 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Tauri | 2.0 | 桌面应用框架 |
| 后端 | Rust | 1.75+ | 核心逻辑、IPC 通信 |
| 前端 | React | 18+ | UI 组件 |
| 语言 | TypeScript | 5.0+ | 类型安全 |
| 样式 | Tailwind CSS | 3.0+ | 原子化 CSS |
| 状态管理 | Zustand | 4.0+ | 轻量级状态管理 |
| 构建 | Vite | 5.0+ | 前端构建工具 |

### 3.2 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      DevSprite 应用                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   前端 (React)                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │ Widget  │ │ Mascot  │ │StatusList│ │PermDialog│   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↕ Tauri Commands                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   后端 (Rust)                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │   IPC   │ │  Event  │ │   Tray  │ │ Commands│   │   │
│  │  │ Handler │ │ Parser  │ │ Manager │ │ Handler │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↕ Named Pipe                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Claude Code Hook                        │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  ~/.claude/settings.json → hooks             │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 数据流

```
Claude Code 执行操作
       ↓
触发钩子 (Hook)
       ↓
发送 JSON 到 Named Pipe
       ↓
Rust 后端监听并解析
       ↓
通过 Tauri Events 发送到前端
       ↓
React 组件更新 UI
       ↓
用户看到状态变化
```

### 3.4 IPC 通信协议

**Named Pipe 路径**：`\\.\pipe\devsprite-<uid>`

**消息格式**（JSON）：
```json
{
  "event": "tool_call",
  "timestamp": "2026-05-12T10:30:00Z",
  "session_id": "abc123",
  "data": {
    "tool_name": "Read",
    "file_path": "/path/to/file.rs",
    "status": "completed"
  }
}
```

**事件类型**：
| event | 描述 | data 字段 |
|-------|------|-----------|
| session_start | 会话开始 | session_id |
| session_end | 会话结束 | session_id |
| tool_call | 工具调用 | tool_name, file_path, status |
| permission_request | 权限请求 | operation, target, reason |
| permission_response | 权限响应 | approved, operation |
| status_change | 状态变化 | status, message |
| ai_response | AI 回复 | content (前 100 字符) |

---

## 4. UI 设计

### 4.1 主面板

**尺寸**：320 x 480px
**样式**：毛玻璃效果（backdrop-filter: blur(20px)）
**圆角**：24px
**阴影**：0 25px 50px -12px rgba(0,0,0,0.25)

**布局**：
```
┌─────────────────────────────────┐
│         DevSprite               │  ← 标题栏（可拖拽）
├─────────────────────────────────┤
│                                 │
│         [吉祥物动画]             │  ← 120x120px
│                                 │
├─────────────────────────────────┤
│  ● 工作中...                    │  ← 状态指示器
│    正在执行 Grep 搜索操作        │
├─────────────────────────────────┤
│  📄 Read file: main.rs    2s   │  ← 工具调用列表
│  🔍 Grep: "fn main"      5s   │
│  ✏️ Edit: config.toml    12s   │
├─────────────────────────────────┤
│  权限请求                    │  ← 权限操作（按需显示）
│  [✓ 批准]  [✗ 拒绝]           │
└─────────────────────────────────┘
```

### 4.2 颜色方案

**主色调**：
- 主色：#667eea（蓝紫渐变起始）
- 辅助色：#764ba2（蓝紫渐变结束）
- 成功色：#22c55e（绿色）
- 警告色：#f59e0b（黄色）
- 错误色：#ef4444（红色）

**中性色**：
- 背景：#f8fafc
- 卡片：#ffffff
- 文字主色：#1e293b
- 文字次色：#64748b
- 边框：#e2e8f0

### 4.3 动画规范

**状态切换**：300ms ease-in-out
**吉祥物动画**：2s ease-in-out infinite（呼吸/弹跳）
**列表项进入**：200ms slide-in from right
**权限弹窗**：200ms scale-in

---

## 5. 项目结构

```
devsprite/
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs               # 应用入口
│   │   ├── lib.rs                # 核心逻辑导出
│   │   ├── ipc/
│   │   │   ├── mod.rs            # IPC 模块定义
│   │   │   ├── named_pipe.rs     # Windows Named Pipe 监听
│   │   │   └── events.rs         # 事件类型定义
│   │   ├── tray.rs               # 系统托盘管理
│   │   ├── commands.rs           # Tauri 命令处理
│   │   └── config.rs             # 配置管理
│   ├── Cargo.toml                # Rust 依赖配置
│   ├── tauri.conf.json           # Tauri 配置
│   └── icons/                    # 应用图标
├── src/                          # TypeScript 前端
│   ├── components/
│   │   ├── Widget.tsx            # 主小组件容器
│   │   ├── Mascot.tsx            # 吉祥物组件
│   │   ├── StatusCard.tsx        # 状态卡片
│   │   ├── ToolList.tsx          # 工具调用列表
│   │   ├── PermissionDialog.tsx  # 权限请求弹窗
│   │   └── TrayMenu.tsx         # 托盘菜单组件
│   ├── hooks/
│   │   ├── useTauriEvent.ts      # Tauri 事件监听
│   │   └── useWindowState.ts     # 窗口状态管理
│   ├── stores/
│   │   └── appStore.ts           # Zustand 状态存储
│   ├── types/
│   │   └── index.ts              # TypeScript 类型定义
│   ├── assets/
│   │   └── mascot/               # 吉祥物图片
│   │       ├── idle.png
│   │       ├── active.png
│   │       ├── working.png
│   │       ├── waiting.png
│   │       └── error.png
│   ├── App.tsx                   # 根组件
│   ├── main.tsx                  # 入口文件
│   └── index.css                 # 全局样式
├── docs/                         # 文档
│   ├── superpowers/
│   │   └── specs/
│   │       └── 2026-05-12-devsprite-design.md
│   └── preview.html              # 效果预览文档
├── package.json                  # Node.js 依赖
├── tailwind.config.js            # Tailwind 配置
├── vite.config.ts                # Vite 配置
├── tsconfig.json                 # TypeScript 配置
└── README.md                     # 项目说明
```

---

## 6. 配置文件

### 6.1 Tauri 配置 (tauri.conf.json)

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:1420",
    "target": "target/release/devsprite"
  },
  "package": {
    "productName": "DevSprite",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "window": {
        "all": false,
        "setAlwaysOnTop": true,
        "setPosition": true,
        "setSize": true,
        "hide": true,
        "show": true
      }
    },
    "windows": [
      {
        "title": "DevSprite",
        "width": 320,
        "height": 480,
        "resizable": false,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true
      }
    ],
    "systemTray": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true
    }
  }
}
```

### 6.2 Claude Code 钩子配置

**位置**：`~/.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "devsprite-bridge send tool_call --data \"$TOOL_INPUT\""
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "devsprite-bridge send notification --data \"$MESSAGE\""
          }
        ]
      }
    ],
    "PermissionRequest": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "devsprite-bridge send permission_request --data \"$PERMISSION\""
          }
        ]
      }
    ]
  }
}
```

---

## 7. 错误处理

### 7.1 错误场景

| 场景 | 处理方式 |
|------|----------|
| Named Pipe 连接失败 | 重试 3 次，间隔 1s，失败后显示错误状态 |
| JSON 解析错误 | 记录日志，跳过该消息，继续监听 |
| Claude Code 未安装 | 首次启动检测，显示引导安装提示 |
| 权限请求超时 | 30s 后自动拒绝，记录日志 |
| 快捷键冲突 | 启动时检测，冲突时提示用户修改 |

### 7.2 日志策略

- **位置**：`%APPDATA%\devsprite\logs\`
- **格式**：`devsprite-YYYY-MM-DD.log`
- **级别**：DEBUG, INFO, WARN, ERROR
- **轮转**：保留最近 7 天

---

## 8. 测试策略

### 8.1 单元测试

- Rust 后端：事件解析、配置管理
- TypeScript 前端：组件渲染、状态管理

### 8.2 集成测试

- IPC 通信：模拟 Claude Code 事件发送
- 权限流程：完整的请求-响应流程

### 8.3 E2E 测试

- 完整工作流：启动 → 监听 → 显示 → 权限 → 跳转

---

## 9. 发布计划

### 9.1 打包格式

- **Windows**：`.msi` 安装包 + `.exe` 便携版
- **大小目标**：< 10MB

### 9.2 分发渠道

- GitHub Releases（主要）
- winget（可选）
- Scoop（可选）

### 9.3 自动更新

- 使用 Tauri 内置的更新机制
- 检查频率：每次启动 + 每 24 小时
- 更新源：GitHub Releases API

---

## 10. 开发计划

| 阶段 | 内容 | 预计时间 | 交付物 |
|------|------|----------|--------|
| Phase 1 | 项目搭建 + 基础 UI | 2-3 天 | 可运行的悬浮窗 |
| Phase 2 | IPC 通信 + Claude Code 钩子 | 3-4 天 | 事件监听和解析 |
| Phase 3 | 状态显示 + 权限管理 | 2-3 天 | 完整的状态展示 |
| Phase 4 | 吉祥物系统 + 动画 | 2-3 天 | 吉祥物动画效果 |
| Phase 5 | 打包发布 + 文档 | 1-2 天 | 可发布的安装包 |

**总计**：10-15 天

---

## 附录 A：参考资源

- [CodeIsland](https://github.com/wxtsky/CodeIsland) - 原始参考项目
- [Tauri 文档](https://tauri.app/v2/guide/) - Tauri 2.0 官方文档
- [Claude Code Hooks](https://docs.anthropic.com/claude-code/hooks) - Claude Code 钩子文档

---

## 附录 B：术语表

| 术语 | 定义 |
|------|------|
| Hook | Claude Code 的事件钩子，用于在特定事件发生时执行命令 |
| Named Pipe | Windows 的进程间通信机制 |
| IPC | 进程间通信（Inter-Process Communication） |
| Sprite | 精灵，指代 Q 版可爱吉祥物形象 |
| Widget | 桌面小组件 |

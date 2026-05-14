# DevSprite

Windows AI 编程工具状态监控桌宠 —— 一只悬浮在桌面上的精灵，实时反映 Claude Code 的工作状态。

## 功能特性

- **实时状态监控** —— 通过 Named Pipe IPC 实时接收 Claude Code 事件，精灵会根据工作状态切换表情和动画
- **悬浮桌宠** —— 精灵始终悬浮在桌面，鼠标悬停时弹出信息面板，显示当前状态、工具调用记录
- **权限请求** —— Claude Code 的权限请求直接在桌宠面板中批准或拒绝，超时自动拒绝
- **拖拽移动** —— 拖拽精灵可在桌面上自由移动，位置自动保存
- **全局快捷键** —— 按 `Ctrl+Shift+D` 快速切换窗口显隐（可自定义）
- **系统托盘** —— 最小化到托盘，右键菜单控制显隐
- **可定制设置** —— 外观主题、行为参数、连接配置均可通过设置面板调整

### 支持的状态

| 状态 | 动画 | 说明 |
|------|------|------|
| idle | 缓慢浮动 | Claude Code 未运行 |
| active | 轻微弹跳旋转 | 有工具正在执行 |
| working | 左右摇摆 | Claude Code 正在处理 |
| waiting | 呼吸闪烁 | 等待用户输入 |
| error | 快速摇晃 | 发生错误 |

## 安装

### 从源码构建

需要 Node.js 18+、Rust 工具链和 Tauri CLI。

```bash
git clone https://github.com/YOUR_USERNAME/devsprite.git
cd devsprite

# 安装依赖
npm install

# 开发模式（带热重载）
npm run tauri dev

# 构建生产版本
npm run tauri build
```

构建产物在 `src-tauri/target/release/devsprite.exe`，可通过 `start-devsprite.cmd` 启动。

## 配置 Claude Code 钩子

桌宠通过 Named Pipe 接收 Claude Code 的事件。需要安装钩子脚本将 Claude Code 事件转发到桌宠。

### 自动安装

```powershell
.\scripts\install-hooks.ps1
```

### 手动安装

编辑 `~/.claude/settings.json`，在 `hooks` 字段添加以下配置：

```json
{
  "hooks": {
    "PreToolUse": [
      { "type": "command", "command": "powershell", "args": ["-ExecutionPolicy", "Bypass", "-File", "G:\\AI\\project\\devsprite\\scripts\\pipe-hook.ps1", "PreToolUse", "$TOOL_NAME"] }
    ],
    "PostToolUse": [
      { "type": "command", "command": "powershell", "args": ["-ExecutionPolicy", "Bypass", "-File", "G:\\AI\\project\\devsprite\\scripts\\pipe-hook.ps1", "PostToolUse", "$TOOL_NAME"] }
    ],
    "Notification": [
      { "type": "command", "command": "powershell", "args": ["-ExecutionPolicy", "Bypass", "-File", "G:\\AI\\project\\devsprite\\scripts\\pipe-hook.ps1", "Notification", "$TOOL_NAME"] }
    ],
    "Stop": [
      { "type": "command", "command": "powershell", "args": ["-ExecutionPolicy", "Bypass", "-File", "G:\\AI\\project\\devsprite\\scripts\\pipe-hook.ps1", "Stop", "$TOOL_NAME"] }
    ],
    "SessionStart": [
      { "type": "command", "command": "powershell", "args": ["-ExecutionPolicy", "Bypass", "-File", "G:\\AI\\project\\devsprite\\scripts\\pipe-hook.ps1", "SessionStart", "$TOOL_NAME"] }
    ]
  }
}
```

### 验证安装

启动桌宠后，在 Claude Code 中运行任意命令，桌宠应自动切换到 active 状态。也可手动测试：

```powershell
# 测试 Named Pipe 连通性
Write-Output '{"event":"tool_call","data":{"tool":"test","status":"running"}}' | .\scripts\devsprite-bridge.cmd
```

## 工作原理

```
Claude Code 事件 → Hook 脚本 → Named Pipe → Tauri 桌宠 → React UI 更新
```

1. **Hook 脚本** (`scripts/pipe-hook.ps1`)：从 stdin 读取 Claude Code 的 JSON 事件，映射为 DevSprite 事件格式，写入 `\\.\pipe\devsprite`
2. **Named Pipe** (`src-tauri/src/ipc/named_pipe.rs`)：监听 `\\.\pipe\devsprite`，接收事件并通过 Tauri 事件系统转发到前端。创建失败时自动指数退避重试
3. **前端** (`src/`)：Zustand store 管理状态，React 组件根据状态切换精灵动画

## 快捷键

| 快捷键 | 功能 | 配置项 |
|--------|------|--------|
| `Ctrl+Shift+D` | 切换窗口显隐 | `behavior.hotkey` |

快捷键可在设置面板的「行为」部分修改。

## 设置

配置文件位于 `%APPDATA%/devsprite/settings.json`，也可通过应用内设置面板修改。

| 分类 | 配置项 | 默认值 | 说明 |
|------|--------|--------|------|
| 外观 | `theme.primary_color` | `#667eea` | 主色调 |
| 外观 | `theme.primary_dark_color` | `#764ba2` | 辅助色 |
| 外观 | `theme.panel_width` | 200 | 面板宽度 (160-300px) |
| 外观 | `theme.panel_border_radius` | 12 | 圆角大小 (0-24px) |
| 外观 | `theme.panel_background_opacity` | 0.95 | 背景透明度 (0.5-1.0) |
| 行为 | `behavior.max_tool_calls` | 5 | 工具调用显示数 (3-10) |
| 行为 | `behavior.permission_timeout` | 30 | 权限超时秒数 (5-60s) |
| 行为 | `behavior.hotkey` | `Ctrl+Shift+D` | 全局快捷键 |
| 连接 | `pipe.name` | `devsprite` | 管道名称（重启生效） |
| 连接 | `pipe.max_retries` | 3 | 连接重试次数 (1-10) |

## 项目结构

```
devsprite/
├── src/                     # 前端 (React + TypeScript)
│   ├── components/          # UI 组件 (Mascot, StatusCard, ToolList, PermissionDialog, SettingsPanel)
│   ├── stores/              # Zustand 状态管理 + 权限超时
│   └── hooks/               # Tauri 事件监听 + 窗口位置保存
├── src-tauri/               # 后端 (Rust + Tauri)
│   ├── src/
│   │   ├── commands.rs      # Tauri 命令
│   │   ├── settings.rs      # 统一设置系统
│   │   ├── logger.rs        # 文件日志 (log4rs)
│   │   └── ipc/             # Named Pipe IPC (含指数退避重连)
│   └── icons/               # 应用图标
├── scripts/                 # 工具脚本
│   ├── install-hooks.ps1    # 安装 Claude Code 钩子
│   ├── pipe-hook.ps1        # 事件转发脚本
│   └── crop-mascot.py       # 吉祥物图片裁剪工具
└── start-devsprite.cmd      # 生产版启动器
```

## 已知限制

- **仅支持 Windows**：Named Pipe 是 Windows 特有的 IPC 机制

## 技术栈

- **前端**：React 18 + TypeScript 5 + Tailwind CSS 3 + Zustand 4 + Vite 5
- **后端**：Tauri 2.0 + Rust + tokio
- **IPC**：Windows Named Pipe
- **Claude Code 集成**：Hooks 系统（stdin JSON）

## 许可证

MIT License

# DevSprite

Windows AI 编程工具状态监控桌宠 —— 一只悬浮在桌面上的精灵，实时反映 Claude Code 的工作状态。

## 功能特性

- **实时状态监控** —— 通过 Named Pipe IPC 实时接收 Claude Code 事件，精灵会根据工作状态切换表情和动画
- **悬浮桌宠** —— 精灵始终悬浮在桌面，鼠标悬停时弹出信息面板，显示当前状态、工具调用记录
- **权限请求** —— Claude Code 的权限请求直接在桌宠面板中批准或拒绝，无需切换窗口
- **拖拽移动** —— 拖拽精灵可在桌面上自由移动
- **系统托盘** —— 最小化到托盘，右键菜单控制显隐

### 支持的状态

| 状态 | 动画 | 说明 |
|------|------|------|
| idle | 待机 | Claude Code 未运行 |
| active | 工作中 | 有工具正在执行 |
| working | 运行中 | Claude Code 正在处理 |
| waiting | 等待中 | 等待用户输入 |
| error | 出错 | 发生错误 |

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
2. **Named Pipe** (`src-tauri/src/ipc/named_pipe.rs`)：监听 `\\.\pipe\devsprite`，接收事件并通过 Tauri 事件系统转发到前端
3. **前端** (`src/`)：Zustand store 管理状态，React 组件根据状态切换精灵动画

## 项目结构

```
devsprite/
├── src/                     # 前端 (React + TypeScript)
│   ├── components/          # UI 组件 (Mascot, StatusCard, ToolList, PermissionDialog)
│   ├── stores/              # Zustand 状态管理
│   └── hooks/               # Tauri 事件监听
├── src-tauri/               # 后端 (Rust + Tauri)
│   ├── src/
│   │   ├── commands.rs      # Tauri 命令
│   │   ├── config.rs        # 配置管理
│   │   └── ipc/             # Named Pipe IPC
│   └── icons/               # 应用图标
├── scripts/                 # 工具脚本
│   ├── install-hooks.ps1    # 安装 Claude Code 钩子
│   ├── pipe-hook.ps1        # 事件转发脚本
│   └── crop-mascot.py       # 吉祥物图片裁剪工具
└── start-devsprite.cmd      # 生产版启动器
```

## 已知限制

- **背景不透明**：WebView2 的透明窗口在生产构建中无法正常渲染，目前使用白色背景
- **仅支持 Windows**：Named Pipe 是 Windows 特有的 IPC 机制

## 技术栈

- **前端**：React 18 + TypeScript 5 + Tailwind CSS 3 + Zustand 4 + Vite 5
- **后端**：Tauri 2.0 + Rust + tokio
- **IPC**：Windows Named Pipe
- **Claude Code 集成**：Hooks 系统（stdin JSON）

## 许可证

MIT License

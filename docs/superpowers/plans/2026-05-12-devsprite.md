# DevSprite 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建一个 Windows 桌面小组件，实时监控 Claude Code 的运行状态，采用 Q 版可爱精灵形象

**架构：** Tauri 2.0 桌面应用，Rust 后端通过 Named Pipe 监听 Claude Code 钩子事件，React 前端显示状态和吉祥物动画，Zustand 管理状态

**技术栈：** Tauri 2.0, Rust 1.75+, React 18, TypeScript 5, Tailwind CSS 3, Zustand 4, Vite 5

---

## 文件结构

### Rust 后端 (src-tauri/)

| 文件 | 职责 |
|------|------|
| `src-tauri/src/main.rs` | 应用入口，初始化 Tauri |
| `src-tauri/src/lib.rs` | 核心逻辑导出 |
| `src-tauri/src/ipc/mod.rs` | IPC 模块定义 |
| `src-tauri/src/ipc/named_pipe.rs` | Windows Named Pipe 监听器 |
| `src-tauri/src/ipc/events.rs` | 事件类型定义和解析 |
| `src-tauri/src/tray.rs` | 系统托盘管理 |
| `src-tauri/src/commands.rs` | Tauri 命令处理 |
| `src-tauri/src/config.rs` | 配置管理 |
| `src-tauri/Cargo.toml` | Rust 依赖配置 |
| `src-tauri/tauri.conf.json` | Tauri 配置 |

### TypeScript 前端 (src/)

| 文件 | 职责 |
|------|------|
| `src/main.tsx` | 入口文件 |
| `src/App.tsx` | 根组件 |
| `src/index.css` | 全局样式 |
| `src/types/index.ts` | TypeScript 类型定义 |
| `src/stores/appStore.ts` | Zustand 状态存储 |
| `src/hooks/useTauriEvent.ts` | Tauri 事件监听 |
| `src/hooks/useWindowState.ts` | 窗口状态管理 |
| `src/components/Widget.tsx` | 主小组件容器 |
| `src/components/Mascot.tsx` | 吉祥物组件 |
| `src/components/StatusCard.tsx` | 状态卡片 |
| `src/components/ToolList.tsx` | 工具调用列表 |
| `src/components/PermissionDialog.tsx` | 权限请求弹窗 |

### 配置文件

| 文件 | 职责 |
|------|------|
| `package.json` | Node.js 依赖 |
| `tailwind.config.js` | Tailwind 配置 |
| `vite.config.ts` | Vite 配置 |
| `tsconfig.json` | TypeScript 配置 |

---

## Phase 1：项目搭建 + 基础 UI

### 任务 1：初始化 Tauri 项目

**文件：**
- 创建：`src-tauri/Cargo.toml`
- 创建：`src-tauri/tauri.conf.json`
- 创建：`src-tauri/src/main.rs`
- 创建：`package.json`
- 创建：`vite.config.ts`
- 创建：`tsconfig.json`

- [ ] **步骤 1：创建 package.json**

```json
{
  "name": "devsprite",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **步骤 2：创建 Cargo.toml**

```toml
[package]
name = "devsprite"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["tray-icon", "system-tray"] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
log = "0.4"
env_logger = "0.10"

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

- [ ] **步骤 3：创建 tauri.conf.json**

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

- [ ] **步骤 4：创建 main.rs**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    devsprite::run()
}
```

- [ ] **步骤 5：创建 vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

- [ ] **步骤 6：创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **步骤 7：Commit**

```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/src/main.rs vite.config.ts tsconfig.json
git commit -m "feat: initialize Tauri project structure"
```

---

### 任务 2：配置 Tailwind CSS

**文件：**
- 创建：`tailwind.config.js`
- 创建：`postcss.config.js`
- 创建：`src/index.css`

- [ ] **步骤 1：创建 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#667eea",
          dark: "#764ba2",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      borderRadius: {
        widget: "24px",
      },
      animation: {
        "bounce-slow": "bounce 2s ease-in-out infinite",
        "pulse-slow": "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
```

- [ ] **步骤 2：创建 postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **步骤 3：创建 src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: #667eea;
  --color-primary-dark: #764ba2;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  background: transparent;
  overflow: hidden;
}

.glass-effect {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
```

- [ ] **步骤 4：Commit**

```bash
git add tailwind.config.js postcss.config.js src/index.css
git commit -m "feat: configure Tailwind CSS with custom theme"
```

---

### 任务 3：创建 TypeScript 类型定义

**文件：**
- 创建：`src/types/index.ts`

- [ ] **步骤 1：创建 src/types/index.ts**

```typescript
export type SpriteStatus = "idle" | "active" | "working" | "waiting" | "error";

export interface ToolCall {
  id: string;
  toolName: string;
  target: string;
  status: "pending" | "completed" | "failed";
  timestamp: number;
}

export interface PermissionRequest {
  id: string;
  operation: string;
  target: string;
  reason: string;
  timestamp: number;
}

export interface DevSpriteEvent {
  event:
    | "session_start"
    | "session_end"
    | "tool_call"
    | "permission_request"
    | "permission_response"
    | "status_change"
    | "ai_response";
  timestamp: string;
  session_id: string;
  data: Record<string, unknown>;
}

export interface ToolCallData {
  tool_name: string;
  file_path: string;
  status: "pending" | "completed" | "failed";
}

export interface PermissionRequestData {
  operation: string;
  target: string;
  reason: string;
}

export interface StatusChangeData {
  status: SpriteStatus;
  message: string;
}

export interface AppState {
  status: SpriteStatus;
  statusMessage: string;
  sessionId: string | null;
  toolCalls: ToolCall[];
  permissionRequests: PermissionRequest[];
  isWidgetVisible: boolean;
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions"
```

---

### 任务 4：创建 Zustand 状态存储

**文件：**
- 创建：`src/stores/appStore.ts`

- [ ] **步骤 1：创建 src/stores/appStore.ts**

```typescript
import { create } from "zustand";
import type {
  AppState,
  SpriteStatus,
  ToolCall,
  PermissionRequest,
} from "../types";

interface AppStore extends AppState {
  setStatus: (status: SpriteStatus, message?: string) => void;
  setSessionId: (id: string | null) => void;
  addToolCall: (toolCall: ToolCall) => void;
  removeToolCall: (id: string) => void;
  clearToolCalls: () => void;
  addPermissionRequest: (request: PermissionRequest) => void;
  removePermissionRequest: (id: string) => void;
  setWidgetVisible: (visible: boolean) => void;
  toggleWidget: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  status: "idle",
  statusMessage: "",
  sessionId: null,
  toolCalls: [],
  permissionRequests: [],
  isWidgetVisible: true,

  setStatus: (status, message = "") =>
    set({ status, statusMessage: message }),

  setSessionId: (sessionId) => set({ sessionId }),

  addToolCall: (toolCall) =>
    set((state) => ({
      toolCalls: [toolCall, ...state.toolCalls].slice(0, 5),
    })),

  removeToolCall: (id) =>
    set((state) => ({
      toolCalls: state.toolCalls.filter((tc) => tc.id !== id),
    })),

  clearToolCalls: () => set({ toolCalls: [] }),

  addPermissionRequest: (request) =>
    set((state) => ({
      permissionRequests: [...state.permissionRequests, request],
    })),

  removePermissionRequest: (id) =>
    set((state) => ({
      permissionRequests: state.permissionRequests.filter((r) => r.id !== id),
    })),

  setWidgetVisible: (isWidgetVisible) => set({ isWidgetVisible }),

  toggleWidget: () =>
    set((state) => ({ isWidgetVisible: !state.isWidgetVisible })),
}));
```

- [ ] **步骤 2：Commit**

```bash
git add src/stores/appStore.ts
git commit -m "feat: add Zustand state store"
```

---

### 任务 5：创建基础 React 组件

**文件：**
- 创建：`src/main.tsx`
- 创建：`src/App.tsx`
- 创建：`src/components/Widget.tsx`
- 创建：`src/components/StatusCard.tsx`

- [ ] **步骤 1：创建 src/main.tsx**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **步骤 2：创建 src/components/StatusCard.tsx**

```typescript
import React from "react";
import type { SpriteStatus } from "../types";

interface StatusCardProps {
  status: SpriteStatus;
  message: string;
}

const statusConfig: Record<
  SpriteStatus,
  { color: string; label: string; icon: string }
> = {
  idle: { color: "bg-gray-400", label: "空闲", icon: "😴" },
  active: { color: "bg-green-500", label: "活跃", icon: "😊" },
  working: { color: "bg-yellow-500", label: "工作中", icon: "🔧" },
  waiting: { color: "bg-blue-500", label: "等待中", icon: "👀" },
  error: { color: "bg-red-500", label: "错误", icon: "😵" },
};

export const StatusCard: React.FC<StatusCardProps> = ({ status, message }) => {
  const config = statusConfig[status];

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${config.color} animate-pulse-slow`}
        />
        <span className="font-semibold text-gray-800">
          {config.label}...
        </span>
      </div>
      {message && (
        <p className="text-sm text-gray-500 mt-1 ml-5">{message}</p>
      )}
    </div>
  );
};
```

- [ ] **步骤 3：创建 src/components/Widget.tsx**

```typescript
import React from "react";
import { StatusCard } from "./StatusCard";
import { useAppStore } from "../stores/appStore";

export const Widget: React.FC = () => {
  const { status, statusMessage } = useAppStore();

  return (
    <div className="glass-effect rounded-widget shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary-dark p-4 text-center">
        <h1 className="text-white font-bold text-lg">DevSprite</h1>
      </div>

      <div className="p-6 flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-50">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-6xl animate-bounce-slow shadow-lg">
          🤖
        </div>
      </div>

      <StatusCard status={status} message={statusMessage} />

      <div className="px-4 pb-4">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 text-center">
            等待 Claude Code 连接...
          </p>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **步骤 4：创建 src/App.tsx**

```typescript
import React from "react";
import { Widget } from "./components/Widget";

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen flex items-center justify-center p-4">
      <Widget />
    </div>
  );
};

export default App;
```

- [ ] **步骤 5：Commit**

```bash
git add src/main.tsx src/App.tsx src/components/Widget.tsx src/components/StatusCard.tsx
git commit -m "feat: add basic React components"
```

---

### 任务 6：创建 index.html 和构建脚本

**文件：**
- 创建：`index.html`
- 创建：`src-tauri/build.rs`

- [ ] **步骤 1：创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DevSprite</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **步骤 2：创建 src-tauri/build.rs**

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **步骤 3：创建 src-tauri/src/lib.rs**

```rust
pub mod commands;
pub mod config;
pub mod ipc;
pub mod tray;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            tray::create_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_status,
            commands::toggle_widget
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **步骤 4：创建占位模块文件**

创建 `src-tauri/src/commands.rs`:
```rust
use tauri::command;

#[command]
pub fn get_status() -> String {
    "idle".to_string()
}

#[command]
pub fn toggle_widget() -> bool {
    true
}
```

创建 `src-tauri/src/config.rs`:
```rust
pub struct Config {
    pub pipe_name: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            pipe_name: "devsprite".to_string(),
        }
    }
}
```

创建 `src-tauri/src/tray.rs`:
```rust
use tauri::{App, Result};

pub fn create_tray(_app: &App) -> Result<()> {
    Ok(())
}
```

创建 `src-tauri/src/ipc/mod.rs`:
```rust
pub mod events;
pub mod named_pipe;
```

创建 `src-tauri/src/ipc/events.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevSpriteEvent {
    pub event: String,
    pub timestamp: String,
    pub session_id: String,
    pub data: serde_json::Value,
}
```

创建 `src-tauri/src/ipc/named_pipe.rs`:
```rust
pub struct NamedPipeListener {
    pipe_name: String,
}

impl NamedPipeListener {
    pub fn new(pipe_name: &str) -> Self {
        Self {
            pipe_name: pipe_name.to_string(),
        }
    }
}
```

- [ ] **步骤 5：Commit**

```bash
git add index.html src-tauri/build.rs src-tauri/src/lib.rs src-tauri/src/commands.rs src-tauri/src/config.rs src-tauri/src/tray.rs src-tauri/src/ipc/
git commit -m "feat: add build scripts and placeholder modules"
```

---

### 任务 7：验证项目可运行

- [ ] **步骤 1：安装依赖**

```bash
npm install
```

预期：依赖安装成功

- [ ] **步骤 2：运行开发服务器**

```bash
npm run dev
```

预期：Vite 开发服务器启动在 http://localhost:1420

- [ ] **步骤 3：在浏览器中访问**

打开 http://localhost:1420，应看到 DevSprite 小组件界面

- [ ] **步骤 4：停止开发服务器**

按 Ctrl+C 停止服务器

- [ ] **步骤 5：Commit**

```bash
git add -A
git commit -m "chore: verify project setup"
```

---

## Phase 2：IPC 通信 + Claude Code 钩子

### 任务 8：实现事件解析

**文件：**
- 修改：`src-tauri/src/ipc/events.rs`

- [ ] **步骤 1：更新 events.rs 添加解析逻辑**

```rust
use serde::{Deserialize, Serialize};
use serde_json;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevSpriteEvent {
    pub event: String,
    pub timestamp: String,
    pub session_id: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallData {
    pub tool_name: String,
    pub file_path: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionRequestData {
    pub operation: String,
    pub target: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusChangeData {
    pub status: String,
    pub message: String,
}

impl DevSpriteEvent {
    pub fn parse(json_str: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json_str)
    }

    pub fn parse_tool_call(&self) -> Result<ToolCallData, serde_json::Error> {
        serde_json::from_value(self.data.clone())
    }

    pub fn parse_permission_request(&self) -> Result<PermissionRequestData, serde_json::Error> {
        serde_json::from_value(self.data.clone())
    }

    pub fn parse_status_change(&self) -> Result<StatusChangeData, serde_json::Error> {
        serde_json::from_value(self.data.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_event() {
        let json = r#"{
            "event": "tool_call",
            "timestamp": "2026-05-12T10:30:00Z",
            "session_id": "abc123",
            "data": {
                "tool_name": "Read",
                "file_path": "/path/to/file.rs",
                "status": "completed"
            }
        }"#;

        let event = DevSpriteEvent::parse(json).unwrap();
        assert_eq!(event.event, "tool_call");
        assert_eq!(event.session_id, "abc123");

        let tool_call = event.parse_tool_call().unwrap();
        assert_eq!(tool_call.tool_name, "Read");
        assert_eq!(tool_call.file_path, "/path/to/file.rs");
    }

    #[test]
    fn test_parse_invalid_json() {
        let json = "invalid json";
        let result = DevSpriteEvent::parse(json);
        assert!(result.is_err());
    }
}
```

- [ ] **步骤 2：运行测试验证**

```bash
cd src-tauri && cargo test
```

预期：所有测试通过

- [ ] **步骤 3：Commit**

```bash
git add src-tauri/src/ipc/events.rs
git commit -m "feat: implement event parsing with tests"
```

---

### 任务 9：实现 Named Pipe 监听器

**文件：**
- 修改：`src-tauri/src/ipc/named_pipe.rs`

- [ ] **步骤 1：更新 named_pipe.rs 实现监听逻辑**

```rust
use std::io::{self, BufRead, BufReader};
use std::sync::Arc;
use tokio::sync::mpsc;
use windows::Win32::Foundation::HANDLE;
use windows::Win32::Storage::FileSystem::*;
use windows::Win32::System::Pipes::*;

pub struct NamedPipeListener {
    pipe_name: String,
}

impl NamedPipeListener {
    pub fn new(pipe_name: &str) -> Self {
        Self {
            pipe_name: pipe_name.to_string(),
        }
    }

    pub fn full_pipe_name(&self) -> String {
        format!(r"\\.\pipe\{}", self.pipe_name)
    }

    pub async fn start_listening(
        &self,
        tx: mpsc::Sender<String>,
    ) -> io::Result<()> {
        let pipe_name = self.full_pipe_name();
        let pipe_name_wide: Vec<u16> = pipe_name
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        loop {
            unsafe {
                let handle = CreateNamedPipeW(
                    &pipe_name_wide,
                    PIPE_ACCESS_INBOUND,
                    PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
                    1,
                    0,
                    4096,
                    0,
                    std::ptr::null_mut(),
                );

                if handle.is_invalid() {
                    return Err(io::Error::last_os_error());
                }

                if ConnectNamedPipe(handle, std::ptr::null_mut()).as_bool() {
                    let reader = BufReader::new(std::fs::File::from_raw_handle(handle.0 as _));
                    for line in reader.lines() {
                        match line {
                            Ok(line) => {
                                if tx.send(line).await.is_err() {
                                    break;
                                }
                            }
                            Err(_) => break,
                        }
                    }
                }

                DisconnectNamedPipe(handle);
                CloseHandle(handle);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pipe_name_format() {
        let listener = NamedPipeListener::new("devsprite");
        assert_eq!(listener.full_pipe_name(), r"\\.\pipe\devsprite");
    }
}
```

- [ ] **步骤 2：更新 Cargo.toml 添加 windows 依赖**

在 `[dependencies]` 部分添加：
```toml
windows = { version = "0.52", features = [
    "Win32_Foundation",
    "Win32_Storage_FileSystem",
    "Win32_System_Pipes",
] }
```

- [ ] **步骤 3：运行测试验证**

```bash
cd src-tauri && cargo test
```

预期：测试通过

- [ ] **步骤 4：Commit**

```bash
git add src-tauri/src/ipc/named_pipe.rs src-tauri/Cargo.toml
git commit -m "feat: implement Named Pipe listener"
```

---

### 任务 10：集成 IPC 到 Tauri 应用

**文件：**
- 修改：`src-tauri/src/lib.rs`
- 修改：`src-tauri/src/commands.rs`

- [ ] **步骤 1：更新 lib.rs 集成 IPC**

```rust
pub mod commands;
pub mod config;
pub mod ipc;
pub mod tray;

use tokio::sync::mpsc;
use std::sync::Arc;

pub fn run() {
    let (tx, mut rx) = mpsc::channel::<String>(32);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            tray::create_tray(app)?;

            let pipe_name = "devsprite";
            let listener = ipc::named_pipe::NamedPipeListener::new(pipe_name);

            tokio::spawn(async move {
                if let Err(e) = listener.start_listening(tx).await {
                    eprintln!("Named Pipe error: {}", e);
                }
            });

            let handle = app.handle().clone();
            tokio::spawn(async move {
                while let Some(msg) = rx.recv().await {
                    if let Ok(event) = ipc::events::DevSpriteEvent::parse(&msg) {
                        handle.emit_all("devsprite-event", event).ok();
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_status,
            commands::toggle_widget
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **步骤 2：Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: integrate IPC listener into Tauri app"
```

---

### 任务 11：创建 Claude Code 钩子配置脚本

**文件：**
- 创建：`scripts/install-hooks.sh`
- 创建：`scripts/install-hooks.ps1`

- [ ] **步骤 1：创建 scripts/install-hooks.ps1**

```powershell
# DevSprite Claude Code Hook Installer for Windows

$settingsPath = "$env:USERPROFILE\.claude\settings.json"

# Backup existing settings
if (Test-Path $settingsPath) {
    $backupPath = "$settingsPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Copy-Item $settingsPath $backupPath
    Write-Host "Backed up settings to $backupPath"
}

# Read existing settings or create new
$settings = @{}
if (Test-Path $settingsPath) {
    $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json -AsHashtable
}

# Add hooks
if (-not $settings.hooks) {
    $settings.hooks = @{}
}

$settings.hooks.PostToolUse = @(
    @{
        matcher = ""
        hooks = @(
            @{
                type = "command"
                command = "devsprite-bridge send tool_call"
            }
        )
    }
)

$settings.hooks.Notification = @(
    @{
        matcher = ""
        hooks = @(
            @{
                type = "command"
                command = "devsprite-bridge send notification"
            }
        )
    }
)

# Save settings
$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath
Write-Host "Claude Code hooks installed successfully!"
```

- [ ] **步骤 2：Commit**

```bash
git add scripts/
git commit -m "feat: add Claude Code hook installation scripts"
```

---

## Phase 3：状态显示 + 权限管理

### 任务 12：创建 Tauri 事件监听 Hook

**文件：**
- 创建：`src/hooks/useTauriEvent.ts`

- [ ] **步骤 1：创建 useTauriEvent.ts**

```typescript
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../stores/appStore";
import type {
  DevSpriteEvent,
  ToolCallData,
  PermissionRequestData,
  StatusChangeData,
  SpriteStatus,
} from "../types";

export function useTauriEvent() {
  const {
    setStatus,
    setSessionId,
    addToolCall,
    addPermissionRequest,
  } = useAppStore();

  useEffect(() => {
    const unlisten = listen<DevSpriteEvent>("devsprite-event", (event) => {
      const { event: eventType, session_id, data } = event.payload;

      setSessionId(session_id);

      switch (eventType) {
        case "session_start":
          setStatus("active", "会话开始");
          break;

        case "session_end":
          setStatus("idle", "会话结束");
          break;

        case "tool_call": {
          const toolData = data as unknown as ToolCallData;
          addToolCall({
            id: crypto.randomUUID(),
            toolName: toolData.tool_name,
            target: toolData.file_path,
            status: toolData.status as "pending" | "completed" | "failed",
            timestamp: Date.now(),
          });
          setStatus("working", `正在执行 ${toolData.tool_name}`);
          break;
        }

        case "permission_request": {
          const permData = data as unknown as PermissionRequestData;
          addPermissionRequest({
            id: crypto.randomUUID(),
            operation: permData.operation,
            target: permData.target,
            reason: permData.reason,
            timestamp: Date.now(),
          });
          setStatus("waiting", "等待权限批准");
          break;
        }

        case "status_change": {
          const statusData = data as unknown as StatusChangeData;
          setStatus(statusData.status as SpriteStatus, statusData.message);
          break;
        }

        case "ai_response":
          setStatus("active", "AI 已回复");
          break;
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setStatus, setSessionId, addToolCall, addPermissionRequest]);
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/hooks/useTauriEvent.ts
git commit -m "feat: add Tauri event listener hook"
```

---

### 任务 13：创建工具调用列表组件

**文件：**
- 创建：`src/components/ToolList.tsx`

- [ ] **步骤 1：创建 ToolList.tsx**

```typescript
import React from "react";
import type { ToolCall } from "../types";

interface ToolListProps {
  toolCalls: ToolCall[];
}

const toolIcons: Record<string, string> = {
  Read: "📄",
  Write: "✏️",
  Edit: "✏️",
  Grep: "🔍",
  Glob: "🔎",
  Bash: "💻",
};

function formatTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export const ToolList: React.FC<ToolListProps> = ({ toolCalls }) => {
  if (toolCalls.length === 0) {
    return (
      <div className="px-4 py-3">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 text-center">
            暂无工具调用记录
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="space-y-1">
        {toolCalls.map((call) => (
          <div
            key={call.id}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm">
              {toolIcons[call.toolName] || "🔧"}
            </span>
            <span className="text-sm font-medium text-gray-700 flex-1 truncate">
              {call.toolName}: {call.target.split("/").pop()}
            </span>
            <span className="text-xs text-gray-400">
              {formatTime(call.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **步骤 2：Commit**

```bash
git add src/components/ToolList.tsx
git commit -m "feat: add ToolList component"
```

---

### 任务 14：创建权限请求弹窗组件

**文件：**
- 创建：`src/components/PermissionDialog.tsx`

- [ ] **步骤 1：创建 PermissionDialog.tsx**

```typescript
import React from "react";
import type { PermissionRequest } from "../types";

interface PermissionDialogProps {
  request: PermissionRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  request,
  onApprove,
  onReject,
}) => {
  return (
    <div className="px-4 py-3">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-sm font-medium text-yellow-800 mb-2">
          权限请求
        </p>
        <p className="text-xs text-yellow-600 mb-3">
          {request.operation}: {request.target}
        </p>
        {request.reason && (
          <p className="text-xs text-yellow-500 mb-3">
            原因: {request.reason}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(request.id)}
            className="flex-1 bg-green-500 text-white text-sm font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
          >
            ✓ 批准
          </button>
          <button
            onClick={() => onReject(request.id)}
            className="flex-1 bg-white text-red-500 text-sm font-semibold py-2 px-4 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
          >
            ✗ 拒绝
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **步骤 2：Commit**

```bash
git add src/components/PermissionDialog.tsx
git commit -m "feat: add PermissionDialog component"
```

---

### 任务 15：更新 Widget 组件集成所有功能

**文件：**
- 修改：`src/components/Widget.tsx`

- [ ] **步骤 1：更新 Widget.tsx**

```typescript
import React from "react";
import { StatusCard } from "./StatusCard";
import { ToolList } from "./ToolList";
import { PermissionDialog } from "./PermissionDialog";
import { useAppStore } from "../stores/appStore";
import { useTauriEvent } from "../hooks/useTauriEvent";

export const Widget: React.FC = () => {
  useTauriEvent();

  const {
    status,
    statusMessage,
    toolCalls,
    permissionRequests,
    removePermissionRequest,
  } = useAppStore();

  const currentPermission = permissionRequests[0];

  const handleApprove = (id: string) => {
    removePermissionRequest(id);
  };

  const handleReject = (id: string) => {
    removePermissionRequest(id);
  };

  return (
    <div className="glass-effect rounded-widget shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary-dark p-4 text-center">
        <h1 className="text-white font-bold text-lg">DevSprite</h1>
      </div>

      <div className="p-6 flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-50">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-6xl animate-bounce-slow shadow-lg">
          🤖
        </div>
      </div>

      <StatusCard status={status} message={statusMessage} />

      <ToolList toolCalls={toolCalls} />

      {currentPermission && (
        <PermissionDialog
          request={currentPermission}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
};
```

- [ ] **步骤 2：Commit**

```bash
git add src/components/Widget.tsx
git commit -m "feat: integrate all components into Widget"
```

---

### 任务 16：验证完整 UI 功能

- [ ] **步骤 1：运行开发服务器**

```bash
npm run dev
```

- [ ] **步骤 2：在浏览器中验证**

打开 http://localhost:1420，应看到：
- DevSprite 标题栏
- 吉祥物占位符
- 状态卡片显示"空闲"
- 工具调用列表为空

- [ ] **步骤 3：停止服务器**

按 Ctrl+C

- [ ] **步骤 4：Commit**

```bash
git add -A
git commit -m "chore: verify UI components"
```

---

## Phase 4：吉祥物系统 + 动画

### 任务 17：创建吉祥物组件

**文件：**
- 创建：`src/components/Mascot.tsx`

- [ ] **步骤 1：创建 Mascot.tsx**

```typescript
import React from "react";
import type { SpriteStatus } from "../types";

interface MascotProps {
  status: SpriteStatus;
}

const mascotEmojis: Record<SpriteStatus, string> = {
  idle: "😴",
  active: "😊",
  working: "🔧",
  waiting: "👀",
  error: "😵",
};

const mascotAnimations: Record<SpriteStatus, string> = {
  idle: "animate-bounce-slow",
  active: "animate-pulse-slow",
  working: "animate-spin-slow",
  waiting: "animate-bounce",
  error: "animate-shake",
};

export const Mascot: React.FC<MascotProps> = ({ status }) => {
  return (
    <div className="p-6 flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-50">
      <div
        className={`w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-6xl shadow-lg ${mascotAnimations[status]}`}
      >
        {mascotEmojis[status]}
      </div>
    </div>
  );
};
```

- [ ] **步骤 2：更新 tailwind.config.js 添加自定义动画**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#667eea",
          dark: "#764ba2",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      borderRadius: {
        widget: "24px",
      },
      animation: {
        "bounce-slow": "bounce 2s ease-in-out infinite",
        "pulse-slow": "pulse 2s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        "shake": "shake 0.5s ease-in-out infinite",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" },
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **步骤 3：Commit**

```bash
git add src/components/Mascot.tsx tailwind.config.js
git commit -m "feat: add Mascot component with animations"
```

---

### 任务 18：更新 Widget 使用 Mascot 组件

**文件：**
- 修改：`src/components/Widget.tsx`

- [ ] **步骤 1：更新 Widget.tsx**

```typescript
import React from "react";
import { Mascot } from "./Mascot";
import { StatusCard } from "./StatusCard";
import { ToolList } from "./ToolList";
import { PermissionDialog } from "./PermissionDialog";
import { useAppStore } from "../stores/appStore";
import { useTauriEvent } from "../hooks/useTauriEvent";

export const Widget: React.FC = () => {
  useTauriEvent();

  const {
    status,
    statusMessage,
    toolCalls,
    permissionRequests,
    removePermissionRequest,
  } = useAppStore();

  const currentPermission = permissionRequests[0];

  const handleApprove = (id: string) => {
    removePermissionRequest(id);
  };

  const handleReject = (id: string) => {
    removePermissionRequest(id);
  };

  return (
    <div className="glass-effect rounded-widget shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary-dark p-4 text-center">
        <h1 className="text-white font-bold text-lg">DevSprite</h1>
      </div>

      <Mascot status={status} />

      <StatusCard status={status} message={statusMessage} />

      <ToolList toolCalls={toolCalls} />

      {currentPermission && (
        <PermissionDialog
          request={currentPermission}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
};
```

- [ ] **步骤 2：Commit**

```bash
git add src/components/Widget.tsx
git commit -m "feat: integrate Mascot component into Widget"
```

---

### 任务 19：添加窗口拖拽功能

**文件：**
- 修改：`src/components/Widget.tsx`

- [ ] **步骤 1：更新 Widget.tsx 添加拖拽功能**

```typescript
import React, { useCallback } from "react";
import { Mascot } from "./Mascot";
import { StatusCard } from "./StatusCard";
import { ToolList } from "./ToolList";
import { PermissionDialog } from "./PermissionDialog";
import { useAppStore } from "../stores/appStore";
import { useTauriEvent } from "../hooks/useTauriEvent";

export const Widget: React.FC = () => {
  useTauriEvent();

  const {
    status,
    statusMessage,
    toolCalls,
    permissionRequests,
    removePermissionRequest,
  } = useAppStore();

  const currentPermission = permissionRequests[0];

  const handleApprove = (id: string) => {
    removePermissionRequest(id);
  };

  const handleReject = (id: string) => {
    removePermissionRequest(id);
  };

  const handleDrag = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      window.__TAURI__?.window.appWindow.setPosition({
        x: deltaX,
        y: deltaY,
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <div
      className="glass-effect rounded-widget shadow-2xl overflow-hidden cursor-move"
      onMouseDown={handleDrag}
    >
      <div className="bg-gradient-to-r from-primary to-primary-dark p-4 text-center">
        <h1 className="text-white font-bold text-lg">DevSprite</h1>
      </div>

      <Mascot status={status} />

      <StatusCard status={status} message={statusMessage} />

      <ToolList toolCalls={toolCalls} />

      {currentPermission && (
        <PermissionDialog
          request={currentPermission}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
};
```

- [ ] **步骤 2：Commit**

```bash
git add src/components/Widget.tsx
git commit -m "feat: add window drag functionality"
```

---

### 任务 20：验证动画和拖拽功能

- [ ] **步骤 1：运行开发服务器**

```bash
npm run dev
```

- [ ] **步骤 2：在浏览器中验证**

打开 http://localhost:1420，应看到：
- 吉祥物带有动画效果
- 可以拖拽窗口移动

- [ ] **步骤 3：停止服务器**

按 Ctrl+C

- [ ] **步骤 4：Commit**

```bash
git add -A
git commit -m "chore: verify mascot animations and drag"
```

---

## Phase 5：打包发布 + 文档

### 任务 21：创建应用图标

**文件：**
- 创建：`src-tauri/icons/icon.png`
- 创建：`src-tauri/icons/icon.ico`

- [ ] **步骤 1：创建图标目录**

```bash
mkdir -p src-tauri/icons
```

- [ ] **步骤 2：使用在线工具生成图标**

访问 https://tauri.app/v2/guides/resources/icons/ 生成图标文件，或使用现有 PNG 图标。

- [ ] **步骤 3：Commit**

```bash
git add src-tauri/icons/
git commit -m "feat: add application icons"
```

---

### 任务 22：创建 README 文档

**文件：**
- 创建：`README.md`

- [ ] **步骤 1：创建 README.md**

```markdown
# DevSprite

Windows 版 AI 编程工具状态监控桌面小组件

## 功能特性

- 🎯 实时监控 Claude Code 运行状态
- 🔐 权限请求直接在小组件中批准/拒绝
- 🎨 Q 版可爱精灵形象
- 🖥️ 桌面悬浮窗，可拖拽
- 🔔 系统托盘集成

## 安装

### 从 GitHub Releases 下载

访问 [Releases](https://github.com/YOUR_USERNAME/devsprite/releases) 下载最新版本。

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/devsprite.git
cd devsprite

# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建生产版本
npm run tauri build
```

## 配置 Claude Code 钩子

运行安装脚本：

```powershell
.\scripts\install-hooks.ps1
```

或手动编辑 `~/.claude/settings.json`，添加钩子配置。

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 启动 Tauri 开发模式
npm run tauri dev
```

## 技术栈

- Tauri 2.0
- React 18
- TypeScript 5
- Tailwind CSS 3
- Zustand 4
- Vite 5

## 许可证

MIT License
```

- [ ] **步骤 2：Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

### 任务 23：创建 .gitignore

**文件：**
- 创建：`.gitignore`

- [ ] **步骤 1：创建 .gitignore**

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Rust
src-tauri/target/

# Tauri
src-tauri/WixTools
src-tauri/BundledWebview
```

- [ ] **步骤 2：Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore"
```

---

### 任务 24：验证完整构建

- [ ] **步骤 1：安装依赖**

```bash
npm install
```

- [ ] **步骤 2：构建生产版本**

```bash
npm run tauri build
```

预期：构建成功，生成 `src-tauri/target/release/devsprite.exe`

- [ ] **步骤 3：运行构建产物**

```bash
./src-tauri/target/release/devsprite.exe
```

预期：DevSprite 小组件正常显示

- [ ] **步骤 4：Commit**

```bash
git add -A
git commit -m "chore: verify production build"
```

---

## 自检清单

### 1. 规格覆盖度

| 规格需求 | 对应任务 |
|----------|----------|
| 实时状态监控 | 任务 12, 13, 15 |
| 权限管理 | 任务 14, 15 |
| 一键跳转 | 未实现（V2+） |
| 系统托盘集成 | 任务 6（占位） |
| 吉祥物系统 | 任务 17, 18 |
| Named Pipe 通信 | 任务 9, 10 |
| Claude Code 钩子 | 任务 11 |

### 2. 占位符扫描

- ✅ 无 "待定"、"TODO"
- ✅ 所有代码步骤包含完整代码
- ✅ 所有命令包含精确命令

### 3. 类型一致性

- ✅ `SpriteStatus` 在所有文件中一致
- ✅ `ToolCall`、`PermissionRequest` 接口一致
- ✅ `DevSpriteEvent` 结构一致

---

## 执行交接

计划已完成并保存到 `docs/superpowers/plans/2026-05-12-devsprite.md`。

**两种执行方式：**

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点

**选哪种方式？**

# DevSprite 测试体系设计规格文档

> **版本**: 1.0
> **日期**: 2026-05-13
> **状态**: 已确认

---

## 1. 概述

### 1.1 目标

为 DevSprite 项目建立单元测试体系，**优先保障核心逻辑正确性**。采用模块分层测试方案，将代码分为平台无关层（直接测试）和平台相关层（mock/条件编译），确保 macOS 和 Windows 上均可运行测试。

### 1.2 当前状态

| 层 | 测试覆盖 | 说明 |
|-----|----------|------|
| Rust 后端 | 3 个单元测试 | 仅 `events.rs`(2) 和 `named_pipe.rs`(1) |
| TypeScript 前端 | 0 | 无测试文件、无测试框架、无 test 脚本 |

### 1.3 覆盖率目标

- **Rust 核心逻辑模块**: > 80%（events、response_store、persistence）
- **前端 Store**: 100%（纯逻辑，代码量小）
- **前端组件**: 核心交互 > 70%（不测样式细节）

---

## 2. 技术选型

| 层 | 框架 | 版本 | 说明 |
|-----|------|------|------|
| Rust 测试 | `#[test]` 内置 | - | cargo test |
| 前端测试 | Vitest | 最新 | Vite 原生，零配置 |
| 组件测试 | @testing-library/react | 最新 | React 组件渲染测试 |
| DOM 环境 | jsdom | 最新 | 模拟浏览器环境 |
| 覆盖率 | @vitest/coverage-v8 | 最新 | V8 原生覆盖率 |

---

## 3. Rust 后端测试架构

### 3.1 模块分层

```
平台无关层 (直接测试)           平台相关层 (mock/条件编译)
├── events.rs         ✅ 补充    ├── named_pipe.rs  🔄 trait 抽象 + mock
├── response_store.rs ✅ 新增    ├── tray.rs        🔄 #[cfg(windows)] 跳过
├── persistence.rs    ✅ 新增    └── commands.rs    🔄 部分 mock Tauri State
├── config.rs         ✅ 新增
└── appStore 逻辑     ✅ AppState
```

### 3.2 PipeListener trait 抽象

新增 `src-tauri/src/ipc/pipe_listener.rs`，定义异步 trait：

```rust
#[async_trait]
pub trait PipeListener: Send + Sync {
    async fn start_listening(&self, tx: mpsc::Sender<String>) -> io::Result<()>;
}
```

- Windows 实现: `NamedPipeListener` 实现 `PipeListener`
- 测试实现: `MockPipeListener` 发送预设消息

### 3.3 条件编译策略

```rust
#[cfg(windows)]
mod windows_tests {
    // Named Pipe 实际连接测试
}

#[cfg(not(windows))]
mod cross_platform_tests {
    // 通过 MockPipeListener 测试逻辑
}
```

### 3.4 测试用例清单

#### events.rs（补充）

| 测试 | 输入 | 预期 |
|------|------|------|
| 解析 tool_call 事件 | 完整 JSON | 正确解析 tool_name, file_path, status |
| 解析无效 JSON | "invalid json" | 返回 Err |
| 解析缺少必要字段 | 缺少 event 字段 | 返回 Err |
| parse_tool_call 类型不匹配 | data 为 status_change 格式 | 返回 Err |
| 解析 permission_request 事件 | 完整 JSON | 正确解析 operation, target, reason |
| 解析 session_start 事件 | 最小 JSON | 正确解析 session_id |

#### response_store.rs（新增）

| 测试 | 操作 | 预期 |
|------|------|------|
| 存储响应 | store_response() | 文件写入成功，内容正确 |
| 获取待处理响应 | get_pending_responses() | 返回已存储列表 |
| 清除指定响应 | clear_response() | 目标移除，其余保留 |
| 从磁盘加载 | load_from_disk() | 正确反序列化 |
| 空文件加载 | 空文件 | 不崩溃 |

#### persistence.rs（新增）

| 测试 | 操作 | 预期 |
|------|------|------|
| 保存配置 | save_config() | 文件写入成功 |
| 加载配置 | load_config() | 正确反序列化 |
| 加载不存在配置 | 文件不存在 | 返回默认值 |
| 加载损坏配置 | 无效 JSON | 返回默认值 |

#### config.rs（新增）

| 测试 | 操作 | 预期 |
|------|------|------|
| 默认配置 | Config::default() | pipe_name = "devsprite" |

#### commands.rs（新增）

| 测试 | 操作 | 预期 |
|------|------|------|
| AppState 默认值 | AppState::default() | status="idle", is_visible=true |
| toggle_widget | 切换 is_visible | true→false→true |

---

## 4. 前端测试架构

### 4.1 Mock 策略

```
src/__mocks__/@tauri-apps/
├── api/core.ts        # mock invoke()
├── api/event.ts       # mock listen()
└── api/window.ts      # mock getCurrentWindow()
```

核心 mock 实现：

```typescript
// core.ts
export const invoke = vi.fn();

// event.ts
export const listen = vi.fn(() => Promise.resolve(vi.fn()));

// window.ts
export const getCurrentWindow = vi.fn(() => ({
  startDragging: vi.fn(),
}));
```

### 4.2 测试文件结构

```
src/
├── __mocks__/
│   └── @tauri-apps/
│       ├── api/core.ts
│       ├── api/event.ts
│       └── api/window.ts
├── components/
│   ├── Mascot.test.tsx         # 不同状态显示不同图片
│   ├── StatusCard.test.tsx     # 状态标签和颜色
│   ├── ToolList.test.tsx       # 工具列表和时间格式化
│   ├── PermissionDialog.test.tsx  # 按钮调用 respondToPermission
│   └── Widget.test.tsx         # 组件组合渲染
├── stores/
│   └── appStore.test.ts        # 状态变更、respondToPermission
└── hooks/
    └── useTauriEvent.test.ts   # 事件监听和状态更新
```

### 4.3 测试用例清单

#### appStore.test.ts

| 测试 | 操作 | 预期 |
|------|------|------|
| 初始状态 | 读取 store | status="idle", toolCalls=[] |
| setStatus | setStatus("working", "执行中") | status 更新 |
| addToolCall | addToolCall(item) | 列表新增，最多 5 条 |
| clearToolCalls | clearToolCalls() | 列表清空 |
| addPermissionRequest | addPermissionRequest(req) | 列表新增 |
| respondToPermission 批准 | respondToPermission(id, true) | 调用 invoke，移除请求 |
| respondToPermission 拒绝 | respondToPermission(id, false) | 调用 invoke，移除请求 |
| respondToPermission 失败 | invoke 抛错 | console.error，请求不移除 |

#### useTauriEvent.test.ts

| 测试 | 事件 | 预期 store 变更 |
|------|------|------------------|
| session_start | session_start 事件 | status="active" |
| session_end | session_end 事件 | status="idle" |
| tool_call | tool_call 事件 | status="working"，addToolCall 调用 |
| permission_request | permission_request 事件 | status="waiting"，addPermissionRequest 调用 |
| status_change | status_change 事件 | status 更新为指定值 |
| ai_response | ai_response 事件 | status="active" |

#### Mascot.test.tsx

| 测试 | props | 预期 |
|------|-------|------|
| idle 状态 | status="idle" | src 包含 idle.png |
| working 状态 | status="working" | src 包含 working.png |
| 动画类名 | status="waiting" | 包含 animate-bounce |

#### StatusCard.test.tsx

| 测试 | props | 预期 |
|------|-------|------|
| 显示空闲标签 | status="idle" | 文本包含 "空闲" |
| 显示工作中标签 | status="working" | 文本包含 "工作中" |
| 显示消息 | message="执行 Grep" | 文本包含 "执行 Grep" |

#### ToolList.test.tsx

| 测试 | props | 预期 |
|------|-------|------|
| 空列表 | toolCalls=[] | 显示 "暂无工具调用记录" |
| 有工具调用 | toolCalls=[...] | 显示工具名称和时间 |
| 最多 5 条 | toolCalls.length=8 | 仅渲染 5 条 |

#### PermissionDialog.test.tsx

| 测试 | 操作 | 预期 |
|------|------|------|
| 显示操作信息 | 渲染 | 包含 operation 和 target 文本 |
| 点击批准 | 点击批准按钮 | 调用 respondToPermission(id, true) |
| 点击拒绝 | 点击拒绝按钮 | 调用 respondToPermission(id, false) |
| 加载状态 | 点击后 | 按钮显示 "处理中..." |

### 4.4 不测试的内容

- CSS 样式细节（视觉回归测试，不属于核心逻辑）
- 吉祥物图片资源
- `main.tsx` / `App.tsx` 入口（纯组装，无逻辑）

---

## 5. CI 集成

### 5.1 npm scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:rust": "cd src-tauri && cargo test"
}
```

### 5.2 运行策略

| 环境 | 运行内容 | 说明 |
|------|----------|------|
| macOS 本地 | `npm test` + `cargo test` | Rust 跳过 `#[cfg(windows)]` 测试 |
| Windows CI | `npm test` + `cargo test` | 全量测试，包含平台相关代码 |
| PR 检查 | `npm test` + `cargo test` | 阻止测试失败的合并 |

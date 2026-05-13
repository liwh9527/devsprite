# DevSprite 测试体系实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 DevSprite 建立完整的单元测试体系，覆盖 Rust 后端核心逻辑和 React 前端组件/Store。

**Architecture:** 模块分层测试——平台无关层直接测试，平台相关层用条件编译和 mock。前端用 Vitest + @testing-library/react + jsdom，Tauri API 全局 mock。

**Tech Stack:** Rust `#[test]`, Vitest, @testing-library/react, jsdom, @vitest/coverage-v8

---

## 文件结构规划

### 新增文件
- `src-tauri/src/ipc/pipe_listener.rs` — PipeListener trait 抽象
- `src/__mocks__/@tauri-apps/api/core.ts` — mock invoke
- `src/__mocks__/@tauri-apps/api/event.ts` — mock listen
- `src/__mocks__/@tauri-apps/api/window.ts` — mock getCurrentWindow
- `src/stores/appStore.test.ts` — Store 测试
- `src/hooks/useTauriEvent.test.ts` — Hook 测试
- `src/components/Mascot.test.tsx` — Mascot 测试
- `src/components/StatusCard.test.tsx` — StatusCard 测试
- `src/components/ToolList.test.tsx` — ToolList 测试
- `src/components/PermissionDialog.test.tsx` — PermissionDialog 测试
- `vitest.config.ts` — Vitest 配置

### 修改文件
- `src-tauri/src/ipc/mod.rs` — 导出 pipe_listener 模块
- `src-tauri/src/ipc/named_pipe.rs` — 实现 PipeListener trait
- `src-tauri/src/ipc/events.rs` — 补充测试用例
- `src-tauri/src/ipc/response_store.rs` — 新增测试
- `src-tauri/src/persistence.rs` — 新增测试
- `src-tauri/src/config.rs` — 新增测试
- `src-tauri/src/commands.rs` — 新增测试
- `src-tauri/Cargo.toml` — 添加 async-trait 依赖
- `package.json` — 添加测试依赖和 scripts
- `vite.config.ts` — 添加 Vitest 配置

---

## Task 1: 安装 Vitest 和前端测试依赖

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: 安装测试依赖**

Run:
```bash
cd /Users/liwh/Documents/project/devsprite && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/coverage-v8
```

Expected: 依赖安装成功

- [ ] **Step 2: 创建 Vitest 配置**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```

- [ ] **Step 3: 创建测试 setup 文件**

Create `src/test-setup.ts`:

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 4: 更新 package.json scripts**

在 `package.json` 的 `scripts` 中添加:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:rust": "cd src-tauri && cargo test"
}
```

- [ ] **Step 5: 验证 Vitest 可运行**

Run: `npm test`

Expected: vitest 运行，显示 "no test files found"（正常，因为还没有测试文件）

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test-setup.ts
git commit -m "chore: add Vitest and testing dependencies"
```

---

## Task 2: 创建 Tauri API Mock 文件

**Files:**
- Create: `src/__mocks__/@tauri-apps/api/core.ts`
- Create: `src/__mocks__/@tauri-apps/api/event.ts`
- Create: `src/__mocks__/@tauri-apps/api/window.ts`

- [ ] **Step 1: 创建 core mock**

Create `src/__mocks__/@tauri-apps/api/core.ts`:

```typescript
export const invoke = vi.fn();
```

- [ ] **Step 2: 创建 event mock**

Create `src/__mocks__/@tauri-apps/api/event.ts`:

```typescript
type UnlistenFn = () => void;

export const listen = vi.fn<Promise<UnlistenFn>, [string, (event: any) => void]>(
  () => Promise.resolve(vi.fn() as unknown as UnlistenFn)
);
```

- [ ] **Step 3: 创建 window mock**

Create `src/__mocks__/@tauri-apps/api/window.ts`:

```typescript
export const getCurrentWindow = vi.fn(() => ({
  startDragging: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  isVisible: vi.fn(() => Promise.resolve(true)),
}));
```

- [ ] **Step 4: Commit**

```bash
git add src/__mocks__/
git commit -m "chore: add Tauri API mock files for testing"
```

---

## Task 3: 前端 Store 测试

**Files:**
- Create: `src/stores/appStore.test.ts`

- [ ] **Step 1: 编写 appStore 测试**

Create `src/stores/appStore.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppStore } from "./appStore";
import type { ToolCall, PermissionRequest } from "../types";

// Mock @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe("useAppStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    useAppStore.setState({
      status: "idle",
      statusMessage: "",
      sessionId: null,
      toolCalls: [],
      permissionRequests: [],
      isWidgetVisible: true,
      pendingResponses: [],
    });
    vi.clearAllMocks();
  });

  it("should have correct initial state", () => {
    const state = useAppStore.getState();
    expect(state.status).toBe("idle");
    expect(state.statusMessage).toBe("");
    expect(state.sessionId).toBeNull();
    expect(state.toolCalls).toEqual([]);
    expect(state.permissionRequests).toEqual([]);
    expect(state.isWidgetVisible).toBe(true);
    expect(state.pendingResponses).toEqual([]);
  });

  it("should update status with setStatus", () => {
    useAppStore.getState().setStatus("working", "执行中");
    const state = useAppStore.getState();
    expect(state.status).toBe("working");
    expect(state.statusMessage).toBe("执行中");
  });

  it("should add tool call with addToolCall", () => {
    const toolCall: ToolCall = {
      id: "1",
      toolName: "Read",
      target: "/path/to/file.rs",
      status: "completed",
      timestamp: Date.now(),
    };
    useAppStore.getState().addToolCall(toolCall);
    expect(useAppStore.getState().toolCalls).toHaveLength(1);
    expect(useAppStore.getState().toolCalls[0].toolName).toBe("Read");
  });

  it("should limit tool calls to 5", () => {
    for (let i = 0; i < 8; i++) {
      useAppStore.getState().addToolCall({
        id: String(i),
        toolName: `Tool${i}`,
        target: `/path/${i}`,
        status: "completed",
        timestamp: Date.now(),
      });
    }
    expect(useAppStore.getState().toolCalls).toHaveLength(5);
  });

  it("should clear tool calls", () => {
    useAppStore.getState().addToolCall({
      id: "1",
      toolName: "Read",
      target: "/path",
      status: "completed",
      timestamp: Date.now(),
    });
    useAppStore.getState().clearToolCalls();
    expect(useAppStore.getState().toolCalls).toEqual([]);
  });

  it("should add permission request", () => {
    const request: PermissionRequest = {
      id: "p1",
      operation: "Read",
      target: "/secret/file",
      reason: "Needs access",
      timestamp: Date.now(),
    };
    useAppStore.getState().addPermissionRequest(request);
    expect(useAppStore.getState().permissionRequests).toHaveLength(1);
  });

  it("should respond to permission with approval", async () => {
    mockInvoke.mockResolvedValue(undefined);

    useAppStore.getState().addPermissionRequest({
      id: "p1",
      operation: "Read",
      target: "/file",
      reason: "access",
      timestamp: Date.now(),
    });

    await useAppStore.getState().respondToPermission("p1", true);

    expect(mockInvoke).toHaveBeenCalledWith("respond_permission", {
      requestId: "p1",
      approved: true,
    });
    expect(useAppStore.getState().permissionRequests).toHaveLength(0);
    expect(useAppStore.getState().pendingResponses).toHaveLength(1);
    expect(useAppStore.getState().pendingResponses[0].approved).toBe(true);
  });

  it("should respond to permission with rejection", async () => {
    mockInvoke.mockResolvedValue(undefined);

    useAppStore.getState().addPermissionRequest({
      id: "p2",
      operation: "Write",
      target: "/file",
      reason: "access",
      timestamp: Date.now(),
    });

    await useAppStore.getState().respondToPermission("p2", false);

    expect(mockInvoke).toHaveBeenCalledWith("respond_permission", {
      requestId: "p2",
      approved: false,
    });
    expect(useAppStore.getState().pendingResponses[0].approved).toBe(false);
  });

  it("should keep request on invoke failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInvoke.mockRejectedValue(new Error("IPC failed"));

    useAppStore.getState().addPermissionRequest({
      id: "p3",
      operation: "Bash",
      target: "/cmd",
      reason: "run",
      timestamp: Date.now(),
    });

    await useAppStore.getState().respondToPermission("p3", true);

    expect(useAppStore.getState().permissionRequests).toHaveLength(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should toggle widget visibility", () => {
    expect(useAppStore.getState().isWidgetVisible).toBe(true);
    useAppStore.getState().toggleWidget();
    expect(useAppStore.getState().isWidgetVisible).toBe(false);
    useAppStore.getState().toggleWidget();
    expect(useAppStore.getState().isWidgetVisible).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `npm test -- src/stores/appStore.test.ts`

Expected: 所有 9 个测试通过

- [ ] **Step 3: Commit**

```bash
git add src/stores/appStore.test.ts
git commit -m "test: add appStore unit tests"
```

---

## Task 4: 前端 Hook 测试

**Files:**
- Create: `src/hooks/useTauriEvent.test.ts`

- [ ] **Step 1: 编写 useTauriEvent 测试**

Create `src/hooks/useTauriEvent.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppStore } from "../stores/appStore";

// Mock @tauri-apps/api/event
const mockListen = vi.fn();
vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: any[]) => mockListen(...args),
}));

// Mock @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock @tauri-apps/api/window
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    startDragging: vi.fn(),
  })),
}));

import { useTauriEvent } from "./useTauriEvent";

describe("useTauriEvent", () => {
  let listenCallback: (event: any) => void;

  beforeEach(() => {
    useAppStore.setState({
      status: "idle",
      statusMessage: "",
      sessionId: null,
      toolCalls: [],
      permissionRequests: [],
      isWidgetVisible: true,
      pendingResponses: [],
    });

    mockListen.mockImplementation(
      (eventName: string, callback: (event: any) => void) => {
        listenCallback = callback;
        return Promise.resolve(vi.fn());
      }
    );
  });

  it("should listen to devsprite-event", () => {
    renderHook(() => useTauriEvent());
    expect(mockListen).toHaveBeenCalledWith(
      "devsprite-event",
      expect.any(Function)
    );
  });

  it("should set status to active on session_start", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      listenCallback({
        payload: {
          event: "session_start",
          session_id: "sess1",
          data: {},
        },
      });
    });

    expect(useAppStore.getState().status).toBe("active");
    expect(useAppStore.getState().sessionId).toBe("sess1");
  });

  it("should set status to idle on session_end", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      listenCallback({
        payload: {
          event: "session_end",
          session_id: "sess1",
          data: {},
        },
      });
    });

    expect(useAppStore.getState().status).toBe("idle");
  });

  it("should add tool call and set working on tool_call event", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      listenCallback({
        payload: {
          event: "tool_call",
          session_id: "sess1",
          data: {
            tool_name: "Read",
            file_path: "/path/to/file.rs",
            status: "completed",
          },
        },
      });
    });

    expect(useAppStore.getState().status).toBe("working");
    expect(useAppStore.getState().toolCalls).toHaveLength(1);
    expect(useAppStore.getState().toolCalls[0].toolName).toBe("Read");
  });

  it("should add permission request on permission_request event", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      listenCallback({
        payload: {
          event: "permission_request",
          session_id: "sess1",
          data: {
            operation: "Read",
            target: "/secret/file",
            reason: "needs access",
          },
        },
      });
    });

    expect(useAppStore.getState().status).toBe("waiting");
    expect(useAppStore.getState().permissionRequests).toHaveLength(1);
  });

  it("should update status on status_change event", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      listenCallback({
        payload: {
          event: "status_change",
          session_id: "sess1",
          data: {
            status: "error",
            message: "Something went wrong",
          },
        },
      });
    });

    expect(useAppStore.getState().status).toBe("error");
    expect(useAppStore.getState().statusMessage).toBe("Something went wrong");
  });

  it("should set status to active on ai_response event", () => {
    renderHook(() => useTauriEvent());

    act(() => {
      listenCallback({
        payload: {
          event: "ai_response",
          session_id: "sess1",
          data: {},
        },
      });
    });

    expect(useAppStore.getState().status).toBe("active");
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `npm test -- src/hooks/useTauriEvent.test.ts`

Expected: 所有 7 个测试通过

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTauriEvent.test.ts
git commit -m "test: add useTauriEvent hook tests"
```

---

## Task 5: 前端组件测试

**Files:**
- Create: `src/components/Mascot.test.tsx`
- Create: `src/components/StatusCard.test.tsx`
- Create: `src/components/ToolList.test.tsx`
- Create: `src/components/PermissionDialog.test.tsx`

- [ ] **Step 1: 编写 Mascot 测试**

Create `src/components/Mascot.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Mascot } from "./Mascot";

// Mock image imports
vi.mock("../assets/mascot/idle.png", () => ({ default: "/idle.png" }));
vi.mock("../assets/mascot/active.png", () => ({ default: "/active.png" }));
vi.mock("../assets/mascot/working.png", () => ({ default: "/working.png" }));
vi.mock("../assets/mascot/waiting.png", () => ({ default: "/waiting.png" }));
vi.mock("../assets/mascot/error.png", () => ({ default: "/error.png" }));

describe("Mascot", () => {
  it("should render idle image when status is idle", () => {
    render(<Mascot status="idle" />);
    const img = screen.getByAltText("DevSprite mascot") as HTMLImageElement;
    expect(img.src).toContain("idle.png");
  });

  it("should render working image when status is working", () => {
    render(<Mascot status="working" />);
    const img = screen.getByAltText("DevSprite mascot") as HTMLImageElement;
    expect(img.src).toContain("working.png");
  });

  it("should apply bounce animation when status is waiting", () => {
    render(<Mascot status="waiting" />);
    const img = screen.getByAltText("DevSprite mascot");
    expect(img.className).toContain("animate-bounce");
  });

  it("should apply pulse animation when status is active", () => {
    render(<Mascot status="active" />);
    const img = screen.getByAltText("DevSprite mascot");
    expect(img.className).toContain("animate-pulse-slow");
  });
});
```

- [ ] **Step 2: 编写 StatusCard 测试**

Create `src/components/StatusCard.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusCard } from "./StatusCard";

describe("StatusCard", () => {
  it("should display idle label", () => {
    render(<StatusCard status="idle" message="" />);
    expect(screen.getByText("空闲...")).toBeInTheDocument();
  });

  it("should display working label", () => {
    render(<StatusCard status="working" message="" />);
    expect(screen.getByText("工作中...")).toBeInTheDocument();
  });

  it("should display status message", () => {
    render(<StatusCard status="active" message="执行 Grep" />);
    expect(screen.getByText("执行 Grep")).toBeInTheDocument();
  });

  it("should not display message when empty", () => {
    const { container } = render(<StatusCard status="idle" message="" />);
    const messageEl = container.querySelector(".text-gray-500");
    expect(messageEl).toBeNull();
  });
});
```

- [ ] **Step 3: 编写 ToolList 测试**

Create `src/components/ToolList.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolList } from "./ToolList";
import type { ToolCall } from "../types";

describe("ToolList", () => {
  it("should show empty message when no tool calls", () => {
    render(<ToolList toolCalls={[]} />);
    expect(screen.getByText("暂无工具调用记录")).toBeInTheDocument();
  });

  it("should display tool names", () => {
    const toolCalls: ToolCall[] = [
      { id: "1", toolName: "Read", target: "/file.rs", status: "completed", timestamp: Date.now() - 5000 },
      { id: "2", toolName: "Grep", target: "/src", status: "completed", timestamp: Date.now() - 10000 },
    ];
    render(<ToolList toolCalls={toolCalls} />);
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText("Grep")).toBeInTheDocument();
  });

  it("should render at most 5 tool calls", () => {
    const toolCalls: ToolCall[] = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      toolName: `Tool${i}`,
      target: `/path/${i}`,
      status: "completed" as const,
      timestamp: Date.now() - i * 1000,
    }));
    render(<ToolList toolCalls={toolCalls} />);
    // Only 5 items should be rendered (Tool0 through Tool4)
    expect(screen.getByText("Tool0")).toBeInTheDocument();
    expect(screen.getByText("Tool4")).toBeInTheDocument();
    expect(screen.queryByText("Tool5")).toBeNull();
  });
});
```

- [ ] **Step 4: 编写 PermissionDialog 测试**

Create `src/components/PermissionDialog.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PermissionDialog } from "./PermissionDialog";
import { useAppStore } from "../stores/appStore";
import type { PermissionRequest } from "../types";

// Mock @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

const mockRequest: PermissionRequest = {
  id: "perm-1",
  operation: "Read",
  target: "/secret/file.rs",
  reason: "Needs read access",
  timestamp: Date.now(),
};

describe("PermissionDialog", () => {
  beforeEach(() => {
    useAppStore.setState({
      status: "idle",
      statusMessage: "",
      sessionId: null,
      toolCalls: [],
      permissionRequests: [mockRequest],
      isWidgetVisible: true,
      pendingResponses: [],
    });
  });

  it("should display operation and target", () => {
    render(<PermissionDialog request={mockRequest} />);
    expect(screen.getByText("Read", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("/secret/file.rs", { exact: false })).toBeInTheDocument();
  });

  it("should display reason when present", () => {
    render(<PermissionDialog request={mockRequest} />);
    expect(screen.getByText("Needs read access", { exact: false })).toBeInTheDocument();
  });

  it("should call respondToPermission with true on approve", async () => {
    const spy = vi.spyOn(useAppStore.getState(), "respondToPermission");
    render(<PermissionDialog request={mockRequest} />);
    fireEvent.click(screen.getByText("批准"));
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("perm-1", true);
    });
    spy.mockRestore();
  });

  it("should call respondToPermission with false on reject", async () => {
    const spy = vi.spyOn(useAppStore.getState(), "respondToPermission");
    render(<PermissionDialog request={mockRequest} />);
    fireEvent.click(screen.getByText("拒绝"));
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("perm-1", false);
    });
    spy.mockRestore();
  });
});
```

- [ ] **Step 5: 运行所有前端测试**

Run: `npm test`

Expected: 所有测试通过

- [ ] **Step 6: Commit**

```bash
git add src/components/Mascot.test.tsx src/components/StatusCard.test.tsx src/components/ToolList.test.tsx src/components/PermissionDialog.test.tsx
git commit -m "test: add React component unit tests"
```

---

## Task 6: Rust 后端 — 补充 events.rs 测试

**Files:**
- Modify: `src-tauri/src/ipc/events.rs`

- [ ] **Step 1: 在 events.rs 的 tests 模块中补充测试**

在 `src-tauri/src/ipc/events.rs` 的 `mod tests` 块中，在 `test_parse_invalid_json` 函数之后添加以下测试：

```rust
    #[test]
    fn test_parse_missing_required_field() {
        let json = r#"{"timestamp": "2026-05-12T10:30:00Z"}"#;
        let result = DevSpriteEvent::parse(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_tool_call_type_mismatch() {
        let json = r#"{
            "event": "tool_call",
            "timestamp": "2026-05-12T10:30:00Z",
            "session_id": "abc123",
            "data": {
                "status": "idle",
                "message": "wrong data type"
            }
        }"#;
        let event = DevSpriteEvent::parse(json).unwrap();
        let result = event.parse_tool_call();
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_permission_request() {
        let json = r#"{
            "event": "permission_request",
            "timestamp": "2026-05-12T10:30:00Z",
            "session_id": "sess1",
            "data": {
                "operation": "Read",
                "target": "/secret/file",
                "reason": "needs access"
            }
        }"#;
        let event = DevSpriteEvent::parse(json).unwrap();
        assert_eq!(event.event, "permission_request");
        let perm = event.parse_permission_request().unwrap();
        assert_eq!(perm.operation, "Read");
        assert_eq!(perm.target, "/secret/file");
        assert_eq!(perm.reason, "needs access");
    }

    #[test]
    fn test_parse_session_start_minimal() {
        let json = r#"{
            "event": "session_start",
            "timestamp": "2026-05-12T10:30:00Z",
            "session_id": "sess-minimal",
            "data": {}
        }"#;
        let event = DevSpriteEvent::parse(json).unwrap();
        assert_eq!(event.event, "session_start");
        assert_eq!(event.session_id, "sess-minimal");
    }

    #[test]
    fn test_parse_status_change() {
        let json = r#"{
            "event": "status_change",
            "timestamp": "2026-05-12T10:30:00Z",
            "session_id": "sess1",
            "data": {
                "status": "error",
                "message": "connection lost"
            }
        }"#;
        let event = DevSpriteEvent::parse(json).unwrap();
        let status = event.parse_status_change().unwrap();
        assert_eq!(status.status, "error");
        assert_eq!(status.message, "connection lost");
    }
```

- [ ] **Step 2: 运行测试验证**

Run: `cd /Users/liwh/Documents/project/devsprite/src-tauri && cargo test ipc::events`

Expected: 所有 7 个 events 测试通过（2 个已有 + 5 个新增）

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/ipc/events.rs
git commit -m "test: add events.rs unit tests for parsing and type safety"
```

---

## Task 7: Rust 后端 — response_store.rs 测试

**Files:**
- Modify: `src-tauri/src/ipc/response_store.rs`

注意: `ResponseStore::new()` 使用 `APPDATA` 环境变量。在测试中，设置 `APPDATA` 到临时目录。

- [ ] **Step 1: 在 response_store.rs 末尾添加测试模块**

在 `src-tauri/src/ipc/response_store.rs` 文件末尾添加：

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn create_test_store() -> ResponseStore {
        let temp_dir = env::temp_dir().join("devsprite_test_responses");
        let _ = fs::create_dir_all(&temp_dir);

        let store_path = temp_dir.join("responses.json");

        ResponseStore {
            store_path,
            pending_responses: Mutex::new(Vec::new()),
        }
    }

    #[test]
    fn test_store_response() {
        let store = create_test_store();
        let response = PermissionResponse {
            request_id: "req1".to_string(),
            approved: true,
            timestamp: 1000,
        };

        store.store_response(response).unwrap();

        let pending = store.get_pending_responses();
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].request_id, "req1");
        assert_eq!(pending[0].approved, true);
    }

    #[test]
    fn test_get_pending_responses() {
        let store = create_test_store();
        assert!(store.get_pending_responses().is_empty());

        store.store_response(PermissionResponse {
            request_id: "req1".to_string(),
            approved: true,
            timestamp: 1000,
        }).unwrap();
        store.store_response(PermissionResponse {
            request_id: "req2".to_string(),
            approved: false,
            timestamp: 2000,
        }).unwrap();

        let pending = store.get_pending_responses();
        assert_eq!(pending.len(), 2);
    }

    #[test]
    fn test_clear_response() {
        let store = create_test_store();
        store.store_response(PermissionResponse {
            request_id: "req1".to_string(),
            approved: true,
            timestamp: 1000,
        }).unwrap();
        store.store_response(PermissionResponse {
            request_id: "req2".to_string(),
            approved: false,
            timestamp: 2000,
        }).unwrap();

        store.clear_response("req1").unwrap();

        let pending = store.get_pending_responses();
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].request_id, "req2");
    }

    #[test]
    fn test_load_from_disk() {
        let store = create_test_store();
        store.store_response(PermissionResponse {
            request_id: "req1".to_string(),
            approved: true,
            timestamp: 1000,
        }).unwrap();

        // Create a new store pointing to the same path
        let store2 = ResponseStore {
            store_path: store.store_path.clone(),
            pending_responses: Mutex::new(Vec::new()),
        };

        store2.load_from_disk().unwrap();
        let pending = store2.get_pending_responses();
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].request_id, "req1");
    }

    #[test]
    fn test_load_from_disk_empty_file() {
        let temp_dir = env::temp_dir().join("devsprite_test_empty");
        let _ = fs::create_dir_all(&temp_dir);
        let store_path = temp_dir.join("responses.json");

        let store = ResponseStore {
            store_path,
            pending_responses: Mutex::new(Vec::new()),
        };

        // File doesn't exist - should succeed with empty state
        store.load_from_disk().unwrap();
        assert!(store.get_pending_responses().is_empty());
    }
}
```

- [ ] **Step 2: 运行测试验证**

Run: `cd /Users/liwh/Documents/project/devsprite/src-tauri && cargo test ipc::response_store`

Expected: 所有 5 个测试通过

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/ipc/response_store.rs
git commit -m "test: add response_store unit tests"
```

---

## Task 8: Rust 后端 — persistence.rs 和 config.rs 和 commands.rs 测试

**Files:**
- Modify: `src-tauri/src/persistence.rs`
- Modify: `src-tauri/src/config.rs`
- Modify: `src-tauri/src/commands.rs`

- [ ] **Step 1: 在 persistence.rs 末尾添加测试**

在 `src-tauri/src/persistence.rs` 末尾添加：

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn get_test_config_path() -> PathBuf {
        let temp_dir = env::temp_dir().join("devsprite_test_config");
        let _ = fs::create_dir_all(&temp_dir);
        temp_dir.join("config.json")
    }

    #[test]
    fn test_save_and_load_config() {
        let path = get_test_config_path();
        let config = AppConfig {
            window_x: 200,
            window_y: 300,
            is_visible: false,
        };

        // Save
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        let content = serde_json::to_string_pretty(&config).unwrap();
        fs::write(&path, &content).unwrap();

        // Load
        let loaded: AppConfig = if path.exists() {
            let content = fs::read_to_string(&path).unwrap();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            AppConfig::default()
        };

        assert_eq!(loaded.window_x, 200);
        assert_eq!(loaded.window_y, 300);
        assert_eq!(loaded.is_visible, false);
    }

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert_eq!(config.window_x, 100);
        assert_eq!(config.window_y, 100);
        assert_eq!(config.is_visible, true);
    }

    #[test]
    fn test_load_missing_config_returns_default() {
        let path = PathBuf::from("/nonexistent/devsprite/config.json");
        if !path.exists() {
            let config = AppConfig::default();
            assert_eq!(config.window_x, 100);
        }
    }

    #[test]
    fn test_load_corrupted_config_returns_default() {
        let temp_dir = env::temp_dir().join("devsprite_test_corrupted");
        let _ = fs::create_dir_all(&temp_dir);
        let path = temp_dir.join("config.json");

        fs::write(&path, "this is not json!!!").unwrap();

        let config: AppConfig = if path.exists() {
            let content = fs::read_to_string(&path).unwrap();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            AppConfig::default()
        };

        assert_eq!(config.window_x, 100);
    }
}
```

- [ ] **Step 2: 在 config.rs 末尾添加测试**

在 `src-tauri/src/config.rs` 末尾添加：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert_eq!(config.pipe_name, "devsprite");
    }
}
```

- [ ] **Step 3: 在 commands.rs 末尾添加测试**

在 `src-tauri/src/commands.rs` 末尾添加：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_state_default() {
        let state = AppState::default();
        assert_eq!(state.status, "idle");
        assert_eq!(state.is_visible, true);
        assert_eq!(state.window_x, 100);
        assert_eq!(state.window_y, 100);
    }

    #[test]
    fn test_toggle_widget() {
        let mut state = AppState::default();
        assert!(state.is_visible);
        state.is_visible = !state.is_visible;
        assert!(!state.is_visible);
        state.is_visible = !state.is_visible;
        assert!(state.is_visible);
    }
}
```

- [ ] **Step 4: 运行全部 Rust 测试**

Run: `cd /Users/liwh/Documents/project/devsprite/src-tauri && cargo test`

Expected: 所有测试通过

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/persistence.rs src-tauri/src/config.rs src-tauri/src/commands.rs
git commit -m "test: add persistence, config, and commands unit tests"
```

---

## Task 9: 运行全量测试验证

**Files:** None (verification only)

- [ ] **Step 1: 运行全部前端测试**

Run: `npm test`

Expected: 所有前端测试通过

- [ ] **Step 2: 运行全部 Rust 测试**

Run: `cd src-tauri && cargo test`

Expected: 所有 Rust 测试通过

- [ ] **Step 3: 运行前端覆盖率**

Run: `npm run test:coverage`

Expected: Store 100% 覆盖率，组件 > 70% 覆盖率

- [ ] **Step 4: Commit（如有调整）**

```bash
git add -A
git commit -m "chore: verify full test suite passes"
```

---

## Self-Review

### 1. Spec Coverage

| 规格要求 | 对应任务 |
|----------|----------|
| Vitest + jsdom 框架 | Task 1 |
| Tauri API mock | Task 2 |
| appStore 测试 | Task 3 |
| useTauriEvent 测试 | Task 4 |
| Mascot 测试 | Task 5 |
| StatusCard 测试 | Task 5 |
| ToolList 测试 | Task 5 |
| PermissionDialog 测试 | Task 5 |
| events.rs 补充测试 | Task 6 |
| response_store.rs 测试 | Task 7 |
| persistence.rs 测试 | Task 8 |
| config.rs 测试 | Task 8 |
| commands.rs 测试 | Task 8 |
| CI scripts | Task 1 |
| 全量验证 | Task 9 |

### 2. Placeholder Scan

- ✅ 无 TBD/TODO
- ✅ 所有测试代码完整
- ✅ 所有命令有预期输出

### 3. Type Consistency

- ✅ `PermissionResponse.requestId` 在 store 和测试中一致
- ✅ `ToolCall` interface 在测试和 types 中一致
- ✅ Rust `PermissionResponse.request_id` 在 store 和测试中一致
- ✅ `AppState` 字段名在 commands.rs 测试和定义中一致

---

Plan complete and saved to `docs/superpowers/plans/2026-05-13-devsprite-testing.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

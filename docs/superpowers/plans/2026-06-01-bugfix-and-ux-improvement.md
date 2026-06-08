# DevSprite Bug 修复 + 体验优化 + 多会话支持 实现计划

日期: 2026-06-01
目标: 修复 4 个 bug、10 个体验优化、多会话支持、6 个死代码清理
架构: Tauri v2 (Rust) + React + Zustand + Named Pipe IPC
技术栈: TypeScript, Rust, Tailwind CSS, Vitest, cargo test

## 文件结构

```
src/
├── components/
│   ├── Widget.tsx              # 主组件，面板布局
│   ├── Mascot.tsx              # 桌宠图片
│   ├── StatusCard.tsx          # 状态卡片
│   ├── ToolList.tsx            # 工具调用列表
│   ├── PermissionDialog.tsx    # 权限请求对话框
│   ├── SettingsPanel.tsx       # 设置面板
│   └── SessionSwitcher.tsx     # [新增] 会话切换器
├── hooks/
│   ├── useTauriEvent.ts        # 事件监听
│   └── useWindowPosition.ts    # 窗口位置
├── stores/
│   └── appStore.ts             # Zustand 状态管理
├── types/
│   └── index.ts                # TypeScript 接口
└── index.css                   # 全局样式

src-tauri/src/
├── lib.rs                      # 应用入口
├── commands.rs                 # Tauri 命令
├── tray.rs                     # 系统托盘
├── settings.rs                 # 设置系统
└── ipc/
    ├── named_pipe.rs           # Named Pipe 服务
    ├── events.rs               # 事件解析
    └── response_store.rs       # 权限响应存储

scripts/
├── pipe-hook.ps1               # Claude Code hook
├── read-response.ps1           # 响应读取
└── install-hooks.ps1           # hook 安装
```

---

## 批次 1：Bug 修复（任务 1-4）

### 任务 1：主题色渐变不生效

**目标**: Widget.tsx 和 SettingsPanel.tsx 的渐变色使用 CSS 变量而非 Tailwind 静态值

**文件**: `src/components/Widget.tsx:47`, `src/components/SettingsPanel.tsx:222`

**步骤 1 - 写失败测试**:
```tsx
// src/components/Widget.test.tsx
it("should use CSS variables for gradient", () => {
  render(<Widget />);
  const header = document.querySelector(".bg-gradient-to-r");
  // 验证使用 style 属性而非 class
});
```

**步骤 2 - 运行测试**: `npm test -- src/components/Widget.test.tsx`

**步骤 3 - 实现修复**:

Widget.tsx 第 47 行:
```tsx
// 修改前
<div className="bg-gradient-to-r from-primary to-primary-dark px-4 py-2 text-center rounded-t-xl">

// 修改后
<div
  className="px-4 py-2 text-center rounded-t-xl"
  style={{
    background: `linear-gradient(to right, var(--color-primary), var(--color-primary-dark))`,
  }}
>
```

SettingsPanel.tsx 第 222 行:
```tsx
// 修改前
className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary to-primary-dark text-white disabled:opacity-50"

// 修改后
className="text-xs px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
style={{
  background: `linear-gradient(to right, var(--color-primary), var(--color-primary-dark))`,
}}
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `fix: use CSS variables for gradient colors instead of Tailwind static classes`

---

### 任务 2：系统托盘状态是空壳

**目标**: `update_tray_status` 实际更新菜单项文本

**文件**: `src-tauri/src/tray.rs:53-65`

**步骤 1 - 写失败测试**:
```rust
// src-tauri/src/tray.rs - 在现有 test 模块中添加
#[test]
fn test_status_label_mapping() {
    assert_eq!(get_status_label("idle"), "空闲");
    assert_eq!(get_status_label("working"), "工作中");
    assert_eq!(get_status_label("unknown"), "未知");
}
```

**步骤 2 - 运行测试**: `cd src-tauri && cargo test`

**步骤 3 - 实现修复**:

tray.rs - 提取辅助函数并修复:
```rust
fn get_status_label(status: &str) -> &str {
    match status {
        "idle" => "空闲",
        "active" => "活跃",
        "working" => "工作中",
        "waiting" => "等待中",
        "error" => "错误",
        _ => "未知",
    }
}

pub fn update_tray_status(app: &App, status: &str) -> tauri::Result<()> {
    let status_label = get_status_label(status);
    let menu_item = app.tray_by_id("main")
        .and_then(|tray| tray.menu_item_by_id("status"));
    if let Some(item) = menu_item {
        let _ = item.set_title(format!("状态: {}", status_label));
    }
    log::info!("Tray status updated: {}", status_label);
    Ok(())
}
```

同时需要在 `create_tray` 中给 tray 设置 id:
```rust
let _tray = TrayIconBuilder::new()
    .id("main")  // 添加这行
    .icon(icon)
```

**步骤 4 - 运行测试**: `cd src-tauri && cargo test`

**步骤 5 - 提交**: `fix: update tray menu status text instead of only logging`

---

### 任务 3：ToolList 硬编码 5 条

**目标**: ToolList 使用 `settings.behavior.max_tool_calls` 而非硬编码 5

**文件**: `src/components/ToolList.tsx:38`

**步骤 1 - 写失败测试**:
```tsx
// src/components/ToolList.test.tsx - 添加
it("should respect maxToolCalls prop", () => {
  const calls = Array.from({ length: 8 }, (_, i) => ({
    id: String(i), toolName: `Tool${i}`, target: `/path/${i}`,
    status: "completed" as const, timestamp: Date.now(),
  }));
  render(<ToolList toolCalls={calls} maxToolCalls={3} />);
  expect(screen.getAllByText(/Tool/)).toHaveLength(3);
});
```

**步骤 2 - 运行测试**: `npm test -- src/components/ToolList.test.tsx`

**步骤 3 - 实现修复**:

ToolList.tsx - 添加 prop:
```tsx
interface ToolListProps {
  toolCalls: ToolCall[];
  maxToolCalls?: number;  // 新增
}

export const ToolList: React.FC<ToolListProps> = ({ toolCalls, maxToolCalls = 5 }) => {
  // ...
  {toolCalls.slice(0, maxToolCalls).map((call) => (
```

Widget.tsx - 传入设置值:
```tsx
const { settings } = useAppStore();
// ...
<ToolList toolCalls={toolCalls} maxToolCalls={settings.behavior.max_tool_calls} />
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `fix: use settings value for ToolList max display count`

---

### 任务 4：权限超时静默消失

**目标**: 超时拒绝时显示通知

**文件**: `src/stores/appStore.ts:152-156`

**步骤 1 - 写失败测试**:
```tsx
// src/stores/appStore.test.ts - 添加
it("should show notification on auto-deny", async () => {
  vi.useFakeTimers();
  const consoleSpy = vi.spyOn(console, "log");

  useAppStore.getState().addPermissionRequest({
    id: "auto-deny", operation: "Read", target: "/f",
    reason: "test", timestamp: Date.now(),
  });
  useAppStore.getState().startPermissionTimeout("auto-deny");

  await vi.advanceTimersByTimeAsync(30000);

  // 验证状态中有超时拒绝的记录
  expect(useAppStore.getState().statusMessage).toContain("超时");
  vi.useRealTimers();
});
```

**步骤 2 - 运行测试**: `npm test -- src/stores/appStore.test.ts`

**步骤 3 - 实现修复**:

appStore.ts - 修改 startPermissionTimeout:
```typescript
startPermissionTimeout: (requestId: string) => {
  const timeout = get().settings.behavior.permission_timeout * 1000;
  const existing = permissionTimers.get(requestId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    get().respondToPermission(requestId, false);
    permissionTimers.delete(requestId);
    // 添加状态提示
    set({ statusMessage: "权限请求已超时自动拒绝" });
    console.log(`Permission request ${requestId} auto-denied after ${timeout}ms`);
  }, timeout);

  permissionTimers.set(requestId, timer);
},
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `fix: show status message when permission auto-denied by timeout`

---

## 批次 2：体验优化（任务 5-14）

### 任务 5：权限请求无倒计时

**目标**: PermissionDialog 显示倒计时

**文件**: `src/components/PermissionDialog.tsx`

**依赖**: 无

**步骤 1 - 写失败测试**:
```tsx
// src/components/PermissionDialog.test.tsx - 添加
it("should display countdown timer", () => {
  vi.useFakeTimers();
  const request = {
    id: "countdown", operation: "Read", target: "/f",
    reason: "test", timestamp: Date.now(),
  };
  render(<PermissionDialog request={request} timeout={30} />);
  expect(screen.getByText(/30/)).toBeInTheDocument();
  vi.useRealTimers();
});
```

**步骤 2 - 运行测试**: `npm test -- src/components/PermissionDialog.test.tsx`

**步骤 3 - 实现修复**:

PermissionDialog.tsx:
```tsx
interface PermissionDialogProps {
  request: PermissionRequest;
  timeout?: number;  // 新增
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({ request, timeout = 30 }) => {
  const [remaining, setRemaining] = useState(timeout);

  useEffect(() => {
    const elapsed = Math.floor((Date.now() - request.timestamp) / 1000);
    setRemaining(Math.max(0, timeout - elapsed));

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - request.timestamp) / 1000);
      setRemaining(Math.max(0, timeout - elapsed));
    }, 1000);

    return () => clearInterval(timer);
  }, [request.timestamp, timeout]);

  // 在按钮上方添加倒计时
  return (
    <div className="px-3 py-2">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
        {/* ... 现有内容 ... */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-yellow-500">
            {remaining > 0 ? `${remaining}s 后自动拒绝` : "已超时"}
          </span>
          <div className="w-16 h-1 bg-yellow-200 rounded overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all duration-1000"
              style={{ width: `${(remaining / timeout) * 100}%` }}
            />
          </div>
        </div>
        {/* ... 按钮 ... */}
      </div>
    </div>
  );
};
```

Widget.tsx - 传入 timeout:
```tsx
<PermissionDialog
  request={currentPermission}
  timeout={settings.behavior.permission_timeout}
/>
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `feat: add countdown timer to permission dialog`

---

### 任务 6：设置保存失败无 UI 反馈

**目标**: SettingsPanel 显示保存成功/失败状态

**文件**: `src/components/SettingsPanel.tsx`, `src/stores/appStore.ts`

**步骤 1 - 写失败测试**:
```tsx
// src/components/SettingsPanel.test.tsx - 添加
it("should show error message on save failure", async () => {
  mockInvoke.mockRejectedValue(new Error("Save failed"));
  render(<SettingsPanel onClose={() => {}} />);
  // 点击保存按钮
  fireEvent.click(screen.getByText("保存"));
  // 等待错误消息
  await waitFor(() => {
    expect(screen.getByText(/保存失败/)).toBeInTheDocument();
  });
});
```

**步骤 2 - 运行测试**: `npm test -- src/components/SettingsPanel.test.tsx`

**步骤 3 - 实现修复**:

appStore.ts - updateSettings 返回成功/失败:
```typescript
updateSettings: async (settings: Settings) => {
  try {
    await invoke("update_settings", { settings });
    set({ settings });
    const { applyTheme } = get();
    applyTheme(settings.theme);
    return { success: true };
  } catch (error) {
    console.error("Failed to update settings:", error);
    return { success: false, error: String(error) };
  }
},
```

SettingsPanel.tsx:
```tsx
const [error, setError] = useState<string | null>(null);

const handleSave = async () => {
  setSaving(true);
  setError(null);
  const result = await updateSettings(localSettings);
  setSaving(false);
  if (result.success) {
    onClose();
  } else {
    setError(result.error || "保存失败");
  }
};

// 在 footer 区域添加错误提示
{error && (
  <p className="text-[10px] text-red-500 px-4 pb-2">{error}</p>
)}
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `feat: show error feedback on settings save failure`

---

### 任务 7："恢复默认"无确认弹窗

**目标**: 重置设置前弹出确认

**文件**: `src/components/SettingsPanel.tsx:46-60`

**步骤 1 - 写失败测试**:
```tsx
it("should confirm before reset", () => {
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<SettingsPanel onClose={() => {}} />);
  fireEvent.click(screen.getByText("恢复默认"));
  expect(confirmSpy).toHaveBeenCalled();
  confirmSpy.mockRestore();
});
```

**步骤 2 - 运行测试**: `npm test -- src/components/SettingsPanel.test.tsx`

**步骤 3 - 实现修复**:

SettingsPanel.tsx:
```tsx
const handleReset = () => {
  if (!window.confirm("确定要恢复默认设置吗？所有自定义配置将丢失。")) {
    return;
  }
  // ... 现有重置逻辑
};
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `fix: add confirmation dialog before resetting settings`

---

### 任务 8：StatusCard 空闲显示"空闲..."

**目标**: 仅非 idle 状态追加省略号

**文件**: `src/components/StatusCard.tsx:30`

**步骤 1 - 写失败测试**:
```tsx
// 修改现有测试
it("should display idle label without dots", () => {
  render(<StatusCard status="idle" message="" />);
  expect(screen.getByText("空闲")).toBeInTheDocument();
});

it("should display working label with dots", () => {
  render(<StatusCard status="working" message="" />);
  expect(screen.getByText("工作中...")).toBeInTheDocument();
});
```

**步骤 2 - 运行测试**: `npm test -- src/components/StatusCard.test.tsx`

**步骤 3 - 实现修复**:

StatusCard.tsx 第 30 行:
```tsx
// 修改前
{config.label}...

// 修改后
{config.label}{status !== "idle" && "..."}
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `fix: remove ellipsis from idle status label`

---

### 任务 9：hover 面板无法 pin 住

**目标**: 添加 pin 按钮锁定面板展开

**文件**: `src/components/Widget.tsx`, `src/index.css`

**步骤 1 - 写失败测试**:
```tsx
it("should toggle pin state on button click", () => {
  render(<Widget />);
  const pinButton = screen.getByTitle("锁定面板");
  fireEvent.click(pinButton);
  expect(document.querySelector(".pet-container.pinned")).toBeInTheDocument();
});
```

**步骤 2 - 运行测试**: `npm test -- src/components/Widget.test.tsx`

**步骤 3 - 实现修复**:

Widget.tsx:
```tsx
const [isPinned, setIsPinned] = useState(false);

// 在 pet-container 上添加 pinned class
<div className={`pet-container ${isPinned ? "pinned" : ""}`} onMouseDown={handleMouseDown}>

// 在面板 header 中添加 pin 按钮
<div
  className="px-4 py-2 text-center rounded-t-xl"
  style={{
    background: `linear-gradient(to right, var(--color-primary), var(--color-primary-dark))`,
  }}
>
  <div className="flex items-center justify-between">
    <h1 className="text-white font-bold text-sm">DevSprite</h1>
    <button
      onClick={() => setIsPinned(!isPinned)}
      className="text-white/70 hover:text-white text-xs"
      title={isPinned ? "取消锁定" : "锁定面板"}
    >
      {isPinned ? "📌" : "📍"}
    </button>
  </div>
</div>
```

index.css - 添加 pinned 状态:
```css
/* Show panel on hover OR when pinned */
.pet-container:hover .pet-panel,
.pet-container.pinned .pet-panel {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto;
}
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `feat: add pin button to lock panel open`

---

### 任务 10：权限队列无指示

**目标**: 显示排队中的权限请求数量

**文件**: `src/components/PermissionDialog.tsx`, `src/components/Widget.tsx`

**依赖**: 任务 9（面板 pin）

**步骤 1 - 写失败测试**:
```tsx
it("should show queue indicator", () => {
  render(<PermissionDialog request={mockRequest} queueLength={3} />);
  expect(screen.getByText("还有 2 个待处理")).toBeInTheDocument();
});
```

**步骤 2 - 运行测试**: `npm test -- src/components/PermissionDialog.test.tsx`

**步骤 3 - 实现修复**:

PermissionDialog.tsx:
```tsx
interface PermissionDialogProps {
  request: PermissionRequest;
  timeout?: number;
  queueLength?: number;  // 新增
}

// 在组件底部添加
{queueLength && queueLength > 1 && (
  <p className="text-[9px] text-gray-400 text-center mt-1">
    还有 {queueLength - 1} 个待处理
  </p>
)}
```

Widget.tsx:
```tsx
{currentPermission && (
  <PermissionDialog
    request={currentPermission}
    timeout={settings.behavior.permission_timeout}
    queueLength={permissionRequests.length}
  />
)}
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `feat: show pending permission queue count`

---

### 任务 11：消息文本无 tooltip

**目标**: 截断文本添加 title 属性

**文件**: `src/components/StatusCard.tsx:34`, `src/components/PermissionDialog.tsx:37-44`

**步骤 1 - 写失败测试**:
```tsx
it("should have title attribute on truncated message", () => {
  const longMessage = "A".repeat(100);
  render(<StatusCard status="working" message={longMessage} />);
  const el = screen.getByText(longMessage);
  expect(el).toHaveAttribute("title", longMessage);
});
```

**步骤 2 - 运行测试**: `npm test -- src/components/StatusCard.test.tsx`

**步骤 3 - 实现修复**:

StatusCard.tsx 第 34 行:
```tsx
// 修改前
<p className="text-[10px] text-gray-500 mt-1 ml-4 truncate">

// 修改后
<p className="text-[10px] text-gray-500 mt-1 ml-4 truncate" title={message}>
```

PermissionDialog.tsx - 给截断文本添加 title:
```tsx
<p className="text-[9px] text-yellow-600 mb-1 truncate" title={request.operation}>
<p className="text-[9px] text-yellow-600 mb-1 truncate" title={request.target}>
<p className="text-[9px] text-yellow-500 mb-2 truncate" title={request.reason}>
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `fix: add title attributes to truncated text for full content on hover`

---

### 任务 12：工具调用时间格式

**目标**: 支持小时和天格式

**文件**: `src/components/ToolList.tsx:17-22`

**步骤 1 - 写失败测试**:
```tsx
// src/components/ToolList.test.tsx - 添加
it("should format hours correctly", () => {
  // 需要 mock Date.now()
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now);
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;
  // 测试 formatTime 输出 "2h"
});
```

**步骤 2 - 运行测试**: `npm test -- src/components/ToolList.test.tsx`

**步骤 3 - 实现修复**:

ToolList.tsx:
```tsx
function formatTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `fix: add hours and days format to tool call timestamps`

---

### 任务 13：工具状态未使用

**目标**: 根据 status 显示不同颜色指示

**文件**: `src/components/ToolList.tsx`

**步骤 1 - 写失败测试**:
```tsx
it("should show different colors for different statuses", () => {
  const calls = [
    { id: "1", toolName: "Read", target: "/f", status: "completed" as const, timestamp: Date.now() },
    { id: "2", toolName: "Write", target: "/f", status: "pending" as const, timestamp: Date.now() },
    { id: "3", toolName: "Bash", target: "/f", status: "failed" as const, timestamp: Date.now() },
  ];
  render(<ToolList toolCalls={calls} />);
  // 验证不同状态有不同的样式
});
```

**步骤 2 - 运行测试**: `npm test -- src/components/ToolList.test.tsx`

**步骤 3 - 实现修复**:

ToolList.tsx:
```tsx
const statusColors: Record<string, string> = {
  pending: "text-yellow-500",
  completed: "text-green-500",
  failed: "text-red-500",
};

// 在 map 中使用
<span className={`text-xs shrink-0 ${statusColors[call.status] || ""}`}>
  {toolIcons[call.toolName] || "🔧"}
</span>
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `feat: show tool call status with color indicators`

---

### 任务 14：设置验证范围不一致

**目标**: 前端 slider 的 min/max 与 Rust 后端一致

**文件**: `src/components/SettingsPanel.tsx`, `src-tauri/src/settings.rs`

**步骤 1 - 写失败测试**:
```tsx
// 前端测试验证 slider 范围
it("should have consistent validation ranges", () => {
  render(<SettingsPanel onClose={() => {}} />);
  const panelWidthSlider = screen.getByDisplayValue("200");
  expect(panelWidthSlider).toHaveAttribute("min", "160");
  expect(panelWidthSlider).toHaveAttribute("max", "300");
});
```

**步骤 2 - 运行测试**: `npm test -- src/components/SettingsPanel.test.tsx`

**步骤 3 - 实现修复**:

核对并确保一致（当前已知一致）:
- panel_width: 160-300 ✓
- opacity: 0.5-1.0 (前端 50-100) ✓
- border_radius: 0-24 ✓
- max_tool_calls: 3-10 ✓
- permission_timeout: 5-60 ✓
- max_retries: 1-10 ✓

如果发现不一致，调整前端 slider 的 min/max 值。

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `fix: ensure frontend slider ranges match backend validation`

---

## 批次 3：多会话支持（任务 15-21）

### 任务 15：Named Pipe 多实例

**目标**: 支持多个 Claude Code 会话同时连接

**文件**: `src-tauri/src/ipc/named_pipe.rs`

**步骤 1 - 写失败测试**:
```rust
#[test]
fn test_unlimited_instances_constant() {
    // PIPE_UNLIMITED_INSTANCES 应该是 255
    assert_eq!(windows::Win32::System::Pipes::PIPE_UNLIMITED_INSTANCES, 255);
}
```

**步骤 2 - 运行测试**: `cd src-tauri && cargo test`

**步骤 3 - 实现修复**:

named_pipe.rs 第 73 行:
```rust
// 修改前
1,  // nMaxInstances

// 修改后
PIPE_UNLIMITED_INSTANCES,  // 支持多会话并发连接
```

同时需要将连接处理改为异步，避免阻塞后续连接:
```rust
// 在 listen_loop 中，连接成功后 spawn 一个新任务处理读取
let tx_clone = tx.clone();
std::thread::spawn(move || {
    // 读取循环
    let mut buffer = vec![0u8; buffer_size];
    let mut bytes_read = 0u32;
    loop {
        let success = ReadFile(handle, Some(&mut buffer), Some(&mut bytes_read), None);
        match success {
            Ok(()) if bytes_read == 0 => break,
            Ok(()) => {
                let msg = String::from_utf8_lossy(&buffer[..bytes_read as usize]);
                if tx_clone.blocking_send(msg.to_string()).is_err() {
                    break;
                }
            }
            Err(_) => break,
        }
    }
    DisconnectNamedPipe(handle).ok();
    CloseHandle(handle).ok();
});
```

**步骤 4 - 运行测试**: `cd src-tauri && cargo test`

**步骤 5 - 提交**: `feat: support multiple named pipe instances for concurrent sessions`

---

### 任务 16：事件按 session_id 路由

**目标**: 后端事件附带 session_id，前端可按 session 过滤

**文件**: `src-tauri/src/lib.rs:67-72`

**步骤 1 - 写失败测试**:
```rust
#[test]
fn test_event_includes_session_id() {
    let json = r#"{"event":"tool_call","timestamp":"2026-06-01","session_id":"s1","data":{}}"#;
    let event = DevSpriteEvent::parse(json).unwrap();
    assert_eq!(event.session_id, "s1");
}
```

**步骤 2 - 运行测试**: `cd src-tauri && cargo test`

**步骤 3 - 实现修复**:

lib.rs - 事件处理无需修改，因为 `DevSpriteEvent` 已经包含 `session_id`，emit 时会自动序列化。前端在 `useTauriEvent.ts` 中按 session 分发即可。

**步骤 4 - 运行测试**: `cd src-tauri && cargo test`

**步骤 5 - 提交**: `refactor: ensure session_id flows through event pipeline`

---

### 任务 17：前端状态按会话分区

**目标**: Zustand store 支持多会话状态隔离

**文件**: `src/stores/appStore.ts`, `src/types/index.ts`

**依赖**: 任务 16

**步骤 1 - 写失败测试**:
```tsx
it("should partition state by session", () => {
  useAppStore.getState().setActiveSession("session-1");
  useAppStore.getState().setStatus("working", "执行中");
  useAppStore.getState().setActiveSession("session-2");
  useAppStore.getState().setStatus("idle", "");

  useAppStore.getState().setActiveSession("session-1");
  expect(useAppStore.getState().status).toBe("working");
});
```

**步骤 2 - 运行测试**: `npm test -- src/stores/appStore.test.ts`

**步骤 3 - 实现修复**:

types/index.ts:
```typescript
export interface SessionState {
  sessionId: string;
  status: SpriteStatus;
  statusMessage: string;
  toolCalls: ToolCall[];
  permissionRequests: PermissionRequest[];
  lastActive: number;
}

export interface AppState {
  sessions: Map<string, SessionState>;
  activeSessionId: string | null;
  isWidgetVisible: boolean;
  pendingResponses: PermissionResponse[];
  settings: Settings;
}
```

appStore.ts - 重构为多会话架构:
```typescript
const getActiveSession = (state: AppStore): SessionState | undefined => {
  return state.activeSessionId ? state.sessions.get(state.activeSessionId) : undefined;
};

// 所有操作默认作用于活跃会话
setStatus: (status, message = "") =>
  set((state) => {
    if (!state.activeSessionId) return state;
    const sessions = new Map(state.sessions);
    const session = sessions.get(state.activeSessionId);
    if (session) {
      sessions.set(state.activeSessionId, { ...session, status, statusMessage: message });
    }
    return { sessions };
  }),
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `feat: partition frontend state by session_id`

---

### 任务 18：ToolCall/PermissionRequest 加 session_id

**目标**: 类型定义添加 sessionId 字段

**文件**: `src/types/index.ts`

**依赖**: 任务 17

**步骤 1 - 写失败测试**:
```tsx
it("should include sessionId in ToolCall", () => {
  const call: ToolCall = {
    id: "1", toolName: "Read", target: "/f",
    status: "completed", timestamp: Date.now(), sessionId: "s1",
  };
  expect(call.sessionId).toBe("s1");
});
```

**步骤 2 - 运行测试**: `npm test -- src/types/index.test.ts`

**步骤 3 - 实现修复**:

types/index.ts:
```typescript
export interface ToolCall {
  id: string;
  toolName: string;
  target: string;
  status: "pending" | "completed" | "failed";
  timestamp: number;
  sessionId: string;  // 新增
}

export interface PermissionRequest {
  id: string;
  operation: string;
  target: string;
  reason: string;
  timestamp: number;
  sessionId: string;  // 新增
}
```

useTauriEvent.ts - 传入 session_id:
```typescript
addToolCall({
  id: crypto.randomUUID(),
  toolName: toolData.tool_name,
  target: toolData.file_path,
  status: toolData.status as "pending" | "completed" | "failed",
  timestamp: Date.now(),
  sessionId: session_id,  // 新增
});
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `feat: add sessionId to ToolCall and PermissionRequest types`

---

### 任务 19：权限响应关联会话

**目标**: PermissionResponse 包含 session_id

**文件**: `src-tauri/src/ipc/response_store.rs`, `src-tauri/src/commands.rs`

**依赖**: 任务 18

**步骤 1 - 写失败测试**:
```rust
#[test]
fn test_response_with_session_id() {
    let store = create_test_store();
    let response = PermissionResponse {
        request_id: "req1".to_string(),
        session_id: "sess1".to_string(),
        approved: true,
        timestamp: 1000,
    };
    store.store_response(response).unwrap();
    let pending = store.get_pending_responses();
    assert_eq!(pending[0].session_id, "sess1");
}
```

**步骤 2 - 运行测试**: `cd src-tauri && cargo test`

**步骤 3 - 实现修复**:

response_store.rs:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionResponse {
    pub request_id: String,
    pub session_id: String,  // 新增
    pub approved: bool,
    pub timestamp: i64,
}
```

commands.rs:
```rust
#[command]
pub fn respond_permission(
    request_id: String,
    session_id: String,  // 新增参数
    approved: bool,
    store: tauri::State<'_, Arc<ResponseStore>>,
) -> Result<(), String> {
    let response = PermissionResponse {
        request_id: request_id.clone(),
        session_id: session_id.clone(),
        approved,
        timestamp: chrono::Utc::now().timestamp(),
    };
    // ...
}
```

**步骤 4 - 运行测试**: `cd src-tauri && cargo test`

**步骤 5 - 提交**: `feat: associate permission responses with session_id`

---

### 任务 20：会话切换 UI

**目标**: 新增 SessionSwitcher 组件

**文件**: `src/components/SessionSwitcher.tsx`（新建）

**依赖**: 任务 17

**步骤 1 - 写失败测试**:
```tsx
// src/components/SessionSwitcher.test.tsx
it("should render session list", () => {
  render(<SessionSwitcher />);
  expect(screen.getByText("会话")).toBeInTheDocument();
});
```

**步骤 2 - 运行测试**: `npm test -- src/components/SessionSwitcher.test.tsx`

**步骤 3 - 实现**:

SessionSwitcher.tsx:
```tsx
import React from "react";
import { useAppStore } from "../stores/appStore";

export const SessionSwitcher: React.FC = () => {
  const { sessions, activeSessionId, setActiveSession } = useAppStore();
  const sessionList = Array.from(sessions.values());

  if (sessionList.length <= 1) return null;

  return (
    <div className="px-3 py-1 border-b border-gray-100">
      <div className="flex gap-1 overflow-x-auto">
        {sessionList.map((session) => (
          <button
            key={session.sessionId}
            onClick={() => setActiveSession(session.sessionId)}
            className={`text-[9px] px-2 py-0.5 rounded-full transition-colors ${
              session.sessionId === activeSessionId
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {session.sessionId.slice(0, 8)}
            {session.permissionRequests.length > 0 && (
              <span className="ml-1 w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
```

Widget.tsx - 集成:
```tsx
import { SessionSwitcher } from "./SessionSwitcher";
// ...
<StatusCard status={status} message={statusMessage} />
<SessionSwitcher />  {/* 添加在 StatusCard 之后 */}
<ToolList toolCalls={toolCalls} />
```

**步骤 4 - 运行测试**: `npm test`

**步骤 5 - 提交**: `feat: add session switcher UI component`

---

### 任务 21：Hook 脚本 session_id 透传

**目标**: 确保 session_id 传递链路完整

**文件**: `scripts/pipe-hook.ps1`, `scripts/install-hooks.ps1`

**依赖**: 任务 19

**步骤 1 - 验证**: 检查 `pipe-hook.ps1` 中 session_id 提取逻辑是否完整

**步骤 2 - 实现修复**:

install-hooks.ps1 - 确保传递 session_id:
```powershell
# 在 hook 配置中确保包含 session_id 参数
$hookConfig = @{
    # ...
    PreToolUse = @{
        command = "powershell"
        args = @("-File", "$PSScriptRoot\pipe-hook.ps1", "-EventType", "tool_call")
    }
}
```

**步骤 3 - 测试**: 手动运行 hook 脚本验证

**步骤 4 - 提交**: `fix: ensure session_id is passed through hook scripts`

---

## 批次 4：死代码清理（任务 22-27）

### 任务 22：mascot_path 死设置

**文件**: `src/types/index.ts:92`, `src-tauri/src/settings.rs`

**步骤**: 删除 `BehaviorSettings.mascot_path` 字段，更新所有引用

**提交**: `chore: remove unused mascot_path setting`

---

### 任务 23：clearAllPermissionTimeouts 未调用

**文件**: `src/stores/appStore.ts:169-172`

**步骤**: 在 Widget 组件卸载时调用，或删除该函数

**提交**: `chore: wire up or remove clearAllPermissionTimeouts`

---

### 任务 24：toggleWidget store 方法未消费

**文件**: `src/stores/appStore.ts:113-114`

**步骤**: 删除 `toggleWidget` 和 `isWidgetVisible`，或接入实际窗口逻辑

**提交**: `chore: remove unused toggleWidget store method`

---

### 任务 25：pendingResponses 只增不减

**文件**: `src/stores/appStore.ts:42`, `src/stores/appStore.ts:100-103`

**步骤**: 在响应处理后清理，或删除该数组

**提交**: `fix: clean up pendingResponses after processing`

---

### 任务 26：sprite-sheet.png 未使用

**文件**: `src/assets/mascot/sprite-sheet.png`

**步骤**: 删除文件

**提交**: `chore: remove unused sprite-sheet.png asset`

---

### 任务 27：$ToolName 参数未传递

**文件**: `scripts/install-hooks.ps1`, `scripts/pipe-hook.ps1`

**步骤**: 修复参数传递或移除未使用的参数

**提交**: `fix: remove or pass $ToolName parameter in hook scripts`

---

## 自检清单

- [ ] 所有 27 个任务已完成
- [ ] 每个任务都有对应的测试
- [ ] `npm test` 全部通过
- [ ] `cd src-tauri && cargo test` 全部通过
- [ ] `npm run tauri dev` 启动正常
- [ ] 主题色渐变生效
- [ ] 托盘状态更新正常
- [ ] ToolList 显示数量跟随设置
- [ ] 权限超时有提示
- [ ] 权限倒计时显示
- [ ] 面板可以 pin 住
- [ ] 多会话可同时连接
- [ ] 会话切换 UI 正常

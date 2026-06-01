# DevSprite Bug 修复 + 体验优化 + 多会话支持 设计文档

日期: 2026-06-01
状态: 已批准
范围: Bug 修复、体验优化、多会话支持、死代码清理

## 背景

DevSprite 是一个 Windows 桌面宠物应用（Tauri v2 + React），通过 Named Pipe IPC 监控 Claude Code 的运行状态。当前版本 0.1.0 核心链路可跑通，但存在多个影响体验的问题，以及多会话支持缺失。

## 工作项总览

共 27 个工作项，按优先级分为 4 组：

- 第一优先级：4 个 Bug 修复
- 第二优先级：10 个体验优化
- 第三优先级：7 个多会话支持
- 第四优先级：6 个死代码清理

---

## 第一优先级：必须修复的 Bug

### 1. 主题色渐变不生效

- **文件**: Widget.tsx, index.css
- **问题**: `applyTheme` 设置 CSS 变量 `--color-primary`，但 Widget.tsx 的渐变使用 Tailwind 静态类 `from-primary` / `to-primary-dark`，引用的是 `tailwind.config.js` 中的硬编码值，而非 CSS 变量
- **修复**: 将渐改用 `style` 属性直接引用 CSS 变量，或改用 `bg-[var(--color-primary)]` 的 Tailwind 任意值语法

### 2. 系统托盘状态是空壳

- **文件**: tray.rs
- **问题**: `update_tray_status` 函数接收 `_app` 参数（带下划线前缀，未使用），只 log 状态标签，不更新菜单项文本。托盘永远显示"状态: 空闲"
- **修复**: 通过 `app.tray_by_id()` 获取 tray handle，用 `menu_item.set_title()` 更新状态文本

### 3. ToolList 硬编码 5 条

- **文件**: ToolList.tsx
- **问题**: `slice(0, 5)` 硬编码，忽略 `settings.behavior.max_tool_calls`。Store 的 `addToolCall` 正确使用了设置值，但显示组件独立硬编码
- **修复**: 将 `slice(0, 5)` 改为 `slice(0, settings.behavior.max_tool_calls)`

### 4. 权限超时静默消失

- **文件**: appStore.ts
- **问题**: `permissionTimers` 超时后自动拒绝，只打 `console.log`，UI 无任何提示。用户不知道权限请求被拒绝了
- **修复**: 超时触发时添加 toast 通知或在状态栏显示"权限请求已超时拒绝"

---

## 第二优先级：体验优化

### 5. 权限请求无倒计时

- **文件**: PermissionDialog.tsx
- **问题**: 用户不知道距自动拒绝还有多少秒
- **修复**: 添加倒计时进度条或数字显示，基于 `settings.behavior.permission_timeout` 和请求创建时间计算剩余秒数

### 6. 设置保存失败无 UI 反馈

- **文件**: SettingsPanel.tsx, appStore.ts
- **问题**: `updateSettings` 失败只打 console，用户看到"保存中..."然后没反应
- **修复**: 在 SettingsPanel 中显示错误提示（红色文字），区分成功/失败状态

### 7. "恢复默认"无确认弹窗

- **文件**: SettingsPanel.tsx
- **问题**: 一键清空所有自定义设置，不可撤销
- **修复**: 添加确认弹窗 `window.confirm()` 或自定义确认组件

### 8. StatusCard 空闲显示"空闲..."

- **文件**: StatusCard.tsx
- **问题**: label 后面统一追加 `...`，idle 状态显示"空闲..."语义不对
- **修复**: 仅在非 idle 状态追加 `...`，或改为动态省略号动画（typing dots）

### 9. hover 面板无法 pin 住

- **文件**: Widget.tsx, index.css
- **问题**: 面板只能 hover 显示，移开鼠标就消失。处理权限或看工具列表时体验差
- **修复**: 添加 pin 按钮，点击后面板锁定展开。再次点击或点击外部区域取消锁定。CSS 从纯 `:hover` 改为 `:hover` + `.pinned` 双触发

### 10. 权限队列无指示

- **文件**: Widget.tsx, PermissionDialog.tsx
- **问题**: 只显示 `permissionRequests[0]`，多个排队时用户看不到"还有 N 个"
- **修复**: 在权限对话框底部添加"还有 N 个待处理"指示器

### 11. 消息文本无 tooltip

- **文件**: StatusCard.tsx, ToolList.tsx
- **问题**: `truncate` 截断后无法查看完整内容
- **修复**: 添加 `title` 属性显示完整文本，或使用自定义 tooltip 组件

### 12. 工具调用时间格式

- **文件**: ToolList.tsx
- **问题**: `formatTime` 只处理秒和分钟，超过 1 小时显示大数字分钟
- **修复**: 添加小时格式 `Xh`，以及超过 24 小时的 `Xd` 格式

### 13. 工具状态未使用

- **文件**: ToolList.tsx
- **问题**: `ToolCall` 类型有 `status` 字段，但 `ToolList` 不显示区分
- **修复**: 根据 status 添加不同的图标颜色或状态指示（如绿色完成、黄色进行中、红色失败）

### 14. 设置验证范围不一致

- **文件**: SettingsPanel.tsx, settings.rs
- **问题**: 前端 slider 的 min/max 与 Rust 后端验证范围需核对一致性
- **修复**: 逐一核对并确保一致。当前已知一致的：panel_width 160-300, opacity 0.5-1.0, border_radius 0-24, max_tool_calls 3-10, permission_timeout 5-60, max_retries 1-10

---

## 第三优先级：多会话支持

### 现状分析

当前架构严格单会话：
- Named Pipe `nMaxInstances = 1`，同一时间只能一个客户端连接
- `session_id` 在数据模型中存在但不用于路由
- Zustand store 是全局单例，不分区会话
- 权限响应按 `request_id` 查找，无会话关联

### 15. Named Pipe 多实例

- **文件**: named_pipe.rs
- **当前**: `nMaxInstances = 1`，严格单连接
- **改为**: `nMaxInstances = PIPE_UNLIMITED_INSTANCES`（255），每个连接独立处理
- **注意**: 需要确保读循环在 `spawn_blocking` 中独立运行，不互相阻塞

### 16. 事件按 session_id 路由

- **文件**: events.rs, lib.rs
- **当前**: 事件解析后 `session_id` 纯透传，不做任何处理
- **改为**: 后端按 `session_id` 分组，通过 Tauri event emit 时附带 session 信息，前端可按 session 过滤
- **数据流**: Pipe → parse → 附带 session_id → emit("devsprite-event") → 前端按 session 分发

### 17. 前端状态按会话分区

- **文件**: appStore.ts, types/index.ts
- **当前**: 全局单例 `status`, `toolCalls`, `permissionRequests`
- **改为**: `Map<string, SessionState>` 结构，每个 session 独立维护状态
- **接口设计**:
  ```typescript
  interface SessionState {
    sessionId: string;
    status: SpriteStatus;
    toolCalls: ToolCall[];
    permissionRequests: PermissionRequest[];
    lastActive: number; // timestamp
  }
  ```
- **兼容性**: 保留 `activeSessionId` 指向当前活跃会话，UI 默认显示活跃会话

### 18. ToolCall/PermissionRequest 加 session_id

- **文件**: types/index.ts
- **当前**: `ToolCall` 和 `PermissionRequest` 没有 `sessionId` 字段，事件处理后丢失会话来源
- **改为**: 添加 `sessionId: string` 字段，事件处理时写入

### 19. 权限响应关联会话

- **文件**: response_store.rs
- **当前**: 按 `request_id` 查找，无会话关联
- **改为**: `PermissionResponse` 添加 `session_id` 字段，存储和查找时使用 `(session_id, request_id)` 复合键
- **影响**: `pipe-hook.ps1` 和 `read-response.ps1` 也需要传递和匹配 session_id

### 20. 会话切换 UI

- **文件**: 新组件 SessionSwitcher.tsx
- **功能**: 显示活跃会话列表，支持点击切换查看
- **位置**: 在 StatusCard 上方或作为 Widget 的一部分
- **交互**: 当非活跃会话有新的权限请求时，显示红点提示

### 21. Hook 脚本 session_id 透传

- **文件**: pipe-hook.ps1, install-hooks.ps1
- **当前**: `pipe-hook.ps1` 已有 session_id 提取逻辑，但 `install-hooks.ps1` 未传递 `$ToolName`
- **修复**: 确认 session_id 传递链路完整，修复 install-hooks.ps1 中缺失的参数传递

---

## 第四优先级：死代码清理

### 22. mascot_path 死设置

- **文件**: types/index.ts, settings.rs
- **问题**: `BehaviorSettings.mascot_path` 定义了但从未接入 Mascot 组件
- **处理**: 删除该字段，或接入 Mascot 组件支持自定义图片路径

### 23. clearAllPermissionTimeouts 未调用

- **文件**: appStore.ts
- **问题**: 函数定义了但从未调用
- **处理**: 在 app 组件卸载时调用，或删除该函数

### 24. toggleWidget store 方法未消费

- **文件**: appStore.ts
- **问题**: `isWidgetVisible` 状态存在但无组件读取
- **处理**: 删除该方法和相关状态，或接入实际窗口显示逻辑

### 25. pendingResponses 只增不减

- **文件**: appStore.ts
- **问题**: `pendingResponses` 数组累积但从不清理，长会话内存泄漏
- **处理**: 添加清理逻辑（响应处理后移除），或删除该数组

### 26. sprite-sheet.png 未使用

- **文件**: src/assets/mascot/sprite-sheet.png
- **问题**: 资源文件存在但无代码引用
- **处理**: 删除文件，或计划用于精灵图动画

### 27. $ToolName 参数未传递

- **文件**: install-hooks.ps1, pipe-hook.ps1
- **问题**: `install-hooks.ps1` 不传递 `$ToolName` 参数，hook 脚本中该参数无效
- **修复**: 在安装脚本中正确传递参数，或从 hook 脚本中移除未使用的参数

---

## 依赖关系

```
第一优先级（#1~#4）: 互相独立，可并行

第二优先级:
  #5（倒计时）→ #4（超时提示）
  #9（面板 pin）→ #10（队列指示）
  其余独立

第三优先级（多会话）:
  #15（Pipe 多实例）→ #16（事件路由）→ #17（状态分区）→ #18（类型扩展）→ #19（权限关联）→ #20（UI）→ #21（Hook 验证）
  自上而下，每层依赖前一层

第四优先级（死代码）: 互相独立，可并行
```

## 复杂度评估

| 复杂度 | 工作项 |
|--------|--------|
| 简单（改几行） | #2, #3, #8, #12, #22~#27 |
| 中等（改 1-2 个文件） | #1, #4, #5, #6, #7, #10, #11, #13, #14, #21 |
| 较复杂（涉及交互逻辑） | #9（面板 pin）、#16（事件路由）、#17（状态分区）、#20（会话切换 UI） |
| 复杂（架构变更） | #15（Named Pipe 多实例）、#19（权限响应关联会话） |

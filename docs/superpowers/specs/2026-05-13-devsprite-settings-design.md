# DevSprite 配置化系统设计规格文档

> **版本**: 1.0
> **日期**: 2026-05-13
> **状态**: 已确认

---

## 1. 概述

### 1.1 目标

将 DevSprite 项目中的硬编码值统一为可配置项，通过 JSON 配置文件存储 + UI 设置面板修改，让用户无需编辑代码即可自定义外观和行为。

### 1.2 当前问题

- `config.rs` 中定义了 `pipe_name` 但未被使用，`lib.rs` 直接硬编码 `"devsprite"`
- `persistence.rs` 仅保存窗口位置和可见性，配置项少
- 主题色、面板样式、行为参数等全部硬编码在源码中
- 用户无法在运行时修改任何配置

---

## 2. 统一配置结构

### 2.1 配置文件

**路径**: `%APPDATA%/devsprite/settings.json`

**结构**:

```json
{
  "window": {
    "x": 100,
    "y": 100,
    "visible": true,
    "width": 220,
    "height": 580
  },
  "pipe": {
    "name": "devsprite",
    "bufferSize": 4096,
    "connectTimeout": 3000
  },
  "theme": {
    "primaryColor": "#667eea",
    "primaryDarkColor": "#764ba2",
    "panelWidth": 200,
    "panelBackgroundOpacity": 0.95,
    "panelBorderRadius": 12
  },
  "behavior": {
    "maxToolCalls": 5,
    "permissionTimeout": 30,
    "mascotPath": null
  }
}
```

### 2.2 字段说明

#### window 组

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| x | i32 | 100 | 窗口 X 坐标 |
| y | i32 | 100 | 窗口 Y 坐标 |
| visible | bool | true | 窗口是否可见 |
| width | i32 | 220 | 窗口宽度 |
| height | i32 | 580 | 窗口高度 |

#### pipe 组

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| name | String | "devsprite" | Named Pipe 名称 |
| bufferSize | usize | 4096 | 读取缓冲区大小 (bytes) |
| connectTimeout | u32 | 3000 | Hook 连接超时 (ms) |

#### theme 组

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| primaryColor | String | "#667eea" | 主色调 |
| primaryDarkColor | String | "#764ba2" | 辅助色 |
| panelWidth | u32 | 200 | 信息面板宽度 (px) |
| panelBackgroundOpacity | f64 | 0.95 | 面板背景透明度 (0.0-1.0) |
| panelBorderRadius | u32 | 12 | 面板圆角 (px) |

#### behavior 组

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| maxToolCalls | u32 | 5 | 工具调用最大显示数 |
| permissionTimeout | u32 | 30 | 权限响应超时 (秒) |
| mascotPath | Option\<String\> | null | 自定义吉祥物目录路径，null 使用内置 |

### 2.3 设计原则

- 所有字段有默认值，文件不存在或损坏时用默认值
- `mascotPath` 为 null 时使用内置吉祥物，自定义时指向用户目录
- 分组扁平：window / pipe / theme / behavior

---

## 3. Rust 后端实现

### 3.1 模块重构

删除 `config.rs` 和 `persistence.rs`，合并为统一的 `settings.rs`：

```
src-tauri/src/
├── settings.rs        # 统一配置结构 + 加载/保存（替代 config.rs + persistence.rs）
├── lib.rs             # 读取 settings 初始化
├── commands.rs        # 新增 get_settings / update_settings 命令
├── ipc/
│   ├── named_pipe.rs  # 从 settings 读取 pipe 配置
│   └── ...
```

### 3.2 Settings 结构体

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub window: WindowSettings,
    pub pipe: PipeSettings,
    pub theme: ThemeSettings,
    pub behavior: BehaviorSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSettings {
    pub x: i32,
    pub y: i32,
    pub visible: bool,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipeSettings {
    pub name: String,
    pub buffer_size: usize,
    pub connect_timeout: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeSettings {
    pub primary_color: String,
    pub primary_dark_color: String,
    pub panel_width: u32,
    pub panel_background_opacity: f64,
    pub panel_border_radius: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehaviorSettings {
    pub max_tool_calls: u32,
    pub permission_timeout: u32,
    pub mascot_path: Option<String>,
}
```

每个子结构体实现 `Default` trait，`Settings::default()` 聚合所有默认值。

### 3.3 文件操作

```rust
pub fn load_settings() -> std::io::Result<Settings>
pub fn save_settings(settings: &Settings) -> std::io::Result<()>
```

- 路径: `%APPDATA%/devsprite/settings.json`
- 不存在时返回默认值
- 损坏时返回默认值并记录日志

### 3.4 配置变更通知

当用户在 UI 中修改设置时：

1. 前端调用 `update_settings` Tauri 命令
2. Rust 后端保存到磁盘 + 更新内存中的共享状态
3. 通过 Tauri Event `settings-changed` 通知前端刷新

### 3.5 动态生效策略

| 配置组 | 生效方式 | 说明 |
|--------|----------|------|
| window | 立即调整窗口位置/大小 | 调用 Tauri window API |
| pipe | 重启后生效 | Pipe 名称变更需重建监听，UI 标注"重启后生效" |
| theme | 通过 CSS 变量实时切换 | `document.documentElement.style.setProperty()` |
| behavior | 立即生效 | 更新 store 中的值 |

### 3.6 Tauri 命令

```rust
#[command]
pub fn get_settings(state: State<'_, Arc<Mutex<Settings>>>) -> Settings

#[command]
pub fn update_settings(
    settings: Settings,
    state: State<'_, Arc<Mutex<Settings>>>,
    app: AppHandle,
) -> Result<(), String>
```

`update_settings` 内部：
1. 验证配置值合法性（颜色格式、数值范围）
2. 保存到磁盘
3. 更新内存状态
4. emit `settings-changed` 事件

---

## 4. 前端设置面板

### 4.1 面板入口

在 Widget 悬停面板底部添加「设置」按钮，点击弹出设置弹窗。

### 4.2 设置弹窗布局

```
┌─────────────────────────────────┐
│  ⚙ 设置                    ✕   │
├─────────────────────────────────┤
│                                 │
│  🎨 外观                        │
│  ├─ 主色调      [颜色选择器]     │
│  ├─ 辅助色      [颜色选择器]     │
│  ├─ 面板宽度    [滑块 160-300]   │
│  ├─ 圆角大小    [滑块 0-24]      │
│  └─ 背景透明度  [滑块 0.5-1.0]   │
│                                 │
│  🖼 吉祥物                      │
│  └─ 自定义路径  [文本框] [浏览]  │
│                                 │
│  ⚙ 行为                        │
│  ├─ 工具显示数  [滑块 3-10]      │
│  └─ 权限超时    [滑块 5-60s]     │
│                                 │
│  📡 连接 (重启后生效)            │
│  └─ 管道名称    [文本框]         │
│                                 │
│       [恢复默认]  [保存]         │
└─────────────────────────────────┘
```

### 4.3 新增文件

```
src/
├── components/
│   └── SettingsPanel.tsx    # 设置弹窗组件
```

### 4.4 主题实时切换

修改 `index.css` 的 CSS 变量由 JS 动态设置：

```typescript
document.documentElement.style.setProperty('--color-primary', settings.theme.primaryColor);
```

所有组件已有 CSS 变量引用，无需修改组件代码。

### 4.5 Store 扩展

`appStore.ts` 新增：

```typescript
interface AppStore extends AppState {
  // ... 现有字段
  settings: Settings;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  applyTheme: (theme: ThemeSettings) => void;
}
```

`applyTheme` 将主题配置应用到 CSS 变量和面板样式。

### 4.6 窗口配置

窗口配置（尺寸）不在 UI 面板中暴露，仅通过 settings.json 文件直接编辑。原因是 Tauri 窗口尺寸变更涉及 DPI 适配和布局重排，在小组件场景下不需要用户频繁调整。

---

## 5. 向后兼容

### 5.1 旧配置文件迁移

如果 `%APPDATA%/devsprite/config.json` 存在，将其中的 `window_x`、`window_y`、`is_visible` 迁移到新的 `settings.json`，然后删除旧文件。

```rust
pub fn migrate_legacy_config() {
    let legacy_path = get_legacy_config_path();
    if legacy_path.exists() {
        if let Ok(legacy) = load_legacy_config() {
            let mut settings = Settings::default();
            settings.window.x = legacy.window_x;
            settings.window.y = legacy.window_y;
            settings.window.visible = legacy.is_visible;
            let _ = save_settings(&settings);
            let _ = fs::remove_file(legacy_path);
        }
    }
}
```

### 5.2 删除的文件

- `src-tauri/src/config.rs` — 合并到 `settings.rs`
- `src-tauri/src/persistence.rs` — 合并到 `settings.rs`

### 5.3 需要更新的文件

- `src-tauri/src/lib.rs` — 使用 `settings.rs` 替代 `config.rs` + `persistence.rs`
- `src-tauri/src/ipc/named_pipe.rs` — 从 settings 读取 pipe name 和 buffer size
- `src-tauri/src/commands.rs` — 新增 settings 命令，移除旧的 window position 命令
- `src/stores/appStore.ts` — 新增 settings 状态和方法
- `src/hooks/useTauriEvent.ts` — 监听 `settings-changed` 事件
- `src/components/Widget.tsx` — 添加设置按钮
- `src/index.css` — CSS 变量保持，值由 JS 动态覆盖
- `src/types/index.ts` — 新增 Settings 类型定义

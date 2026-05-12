# DevSprite 完成阶段实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 完成 DevSprite 项目的所有剩余功能，使其可以发布使用

**架构：** 基于现有的 Tauri 2.0 + React 18 项目，完成 Named Pipe IPC 实现、窗口拖拽修复、生产构建配置

**技术栈：** Tauri 2.0, Rust, React 18, TypeScript, Tailwind CSS

---

## 文件结构

### 需要修改的文件

| 文件 | 职责 |
|------|------|
| `src-tauri/src/ipc/named_pipe.rs` | 实现 Windows Named Pipe 监听 |
| `src/components/Widget.tsx` | 修复窗口拖拽功能 |
| `scripts/devsprite-bridge.ps1` | 创建事件发送桥接脚本 |
| `scripts/install-hooks.ps1` | 更新钩子安装脚本 |
| `package.json` | 添加构建脚本 |

---

## 任务 1：修复吉祥物图片裁剪

**文件：**
- 修改：`src/assets/mascot/*.png`（重新截取）
- 修改：`scripts/crop-mascot.py`（创建裁剪脚本）

- [ ] **步骤 1：创建裁剪脚本**

```python
#!/usr/bin/env python3
"""Crop mascot sprite sheet to individual poses"""
from PIL import Image
import os

def crop_sprites(input_path, output_dir):
    img = Image.open(input_path)
    width, height = img.size
    
    poses = ['idle', 'active', 'working', 'waiting', 'error']
    pose_width = width // 5
    
    os.makedirs(output_dir, exist_ok=True)
    
    for i, pose in enumerate(poses):
        left = i * pose_width + 20  # 小边距
        right = (i + 1) * pose_width - 20
        top = 200  # 裁掉顶部灰色
        bottom = height - 200  # 裁掉底部灰色
        
        cropped = img.crop((left, top, right, bottom))
        cropped.save(f'{output_dir}/{pose}.png', 'PNG')
        print(f"Saved: {pose}.png ({cropped.size[0]}x{cropped.size[1]})")

if __name__ == "__main__":
    crop_sprites(
        "ChatGPT Image 2026年5月13日 00_50_11.png",
        "src/assets/mascot"
    )
```

- [ ] **步骤 2：运行裁剪脚本**

```bash
cd G:/AI/project/devsprite
python scripts/crop-mascot.py
```

预期：5 个 PNG 文件被重新截取

- [ ] **步骤 3：Commit**

```bash
git add scripts/crop-mascot.py src/assets/mascot/
git commit -m "fix: recrop mascot images with better margins"
```

---

## 任务 2：实现 Windows Named Pipe 监听

**文件：**
- 修改：`src-tauri/src/ipc/named_pipe.rs`
- 修改：`src-tauri/Cargo.toml`

- [ ] **步骤 1：更新 Cargo.toml 添加 windows 依赖**

```toml
[package]
name = "devsprite"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
log = "0.4"
env_logger = "0.10"
windows = { version = "0.52", features = [
    "Win32_Foundation",
    "Win32_Storage_FileSystem",
    "Win32_System_Pipes",
] }
```

- [ ] **步骤 2：实现 Named Pipe 监听器**

```rust
use std::io;
use tokio::sync::mpsc;
use windows::Win32::Foundation::*;
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
                    let mut buffer = [0u8; 4096];
                    let mut bytes_read = 0u32;

                    loop {
                        let success = ReadFile(
                            handle,
                            Some(&mut buffer),
                            Some(&mut bytes_read),
                            std::ptr::null_mut(),
                        )
                        .as_bool();

                        if !success || bytes_read == 0 {
                            break;
                        }

                        let msg = String::from_utf8_lossy(&buffer[..bytes_read as usize]);
                        if tx.send(msg.to_string()).await.is_err() {
                            break;
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

- [ ] **步骤 3：构建验证**

```bash
cd src-tauri && cargo build
```

预期：编译成功

- [ ] **步骤 4：Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/ipc/named_pipe.rs
git commit -m "feat: implement Windows Named Pipe listener"
```

---

## 任务 3：创建事件发送桥接脚本

**文件：**
- 创建：`scripts/devsprite-bridge.ps1`

- [ ] **步骤 1：创建 PowerShell 桥接脚本**

```powershell
# DevSprite Bridge - Sends events to DevSocket via Named Pipe
# Usage: devsprite-bridge.ps1 <event_type> [--data <json>]

param(
    [Parameter(Position=0)]
    [string]$EventType,
    
    [Parameter()]
    [string]$Data
)

$pipeName = "devsprite"

function Send-Event {
    param(
        [string]$Event,
        [string]$JsonData
    )
    
    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $sessionId = [guid]::NewGuid().ToString()
    
    $message = @{
        event = $Event
        timestamp = $timestamp
        session_id = $sessionId
        data = $JsonData | ConvertFrom-Json
    } | ConvertTo-Json -Depth 10
    
    try {
        $pipe = New-Object System.IO.Pipes.NamedPipeClientStream(
            ".",
            $pipeName,
            [System.IO.Pipes.PipeDirection]::Out
        )
        
        $pipe.Connect(5000)
        
        $writer = New-Object System.IO.StreamWriter($pipe)
        $writer.WriteLine($message)
        $writer.Flush()
        
        $pipe.Close()
        Write-Host "Event sent: $Event"
    }
    catch {
        Write-Warning "Failed to send event: $_"
    }
}

switch ($EventType) {
    "tool_call" {
        $data = if ($Data) { $Data } else { '{"tool_name":"unknown","file_path":"","status":"pending"}' }
        Send-Event -Event "tool_call" -JsonData $data
    }
    "permission_request" {
        $data = if ($Data) { $Data } else { '{"operation":"unknown","target":"","reason":""}' }
        Send-Event -Event "permission_request" -JsonData $data
    }
    "notification" {
        $data = if ($Data) { $Data } else { '{"message":""}' }
        Send-Event -Event "status_change" -JsonData $data
    }
    default {
        Write-Host "Usage: devsprite-bridge.ps1 <event_type> [--data <json>]"
        Write-Host "Event types: tool_call, permission_request, notification"
    }
}
```

- [ ] **步骤 2：创建 devsprite-bridge.cmd 包装器**

```cmd
@echo off
powershell.exe -ExecutionPolicy Bypass -File "%~dp0devsprite-bridge.ps1" %*
```

- [ ] **步骤 3：Commit**

```bash
git add scripts/devsprite-bridge.ps1 scripts/devsprite-bridge.cmd
git commit -m "feat: add event bridge script for Claude Code hooks"
```

---

## 任务 4：更新钩子安装脚本

**文件：**
- 修改：`scripts/install-hooks.ps1`

- [ ] **步骤 1：更新安装脚本使用新桥接命令**

```powershell
# DevSprite Claude Code Hook Installer for Windows

$settingsPath = "$env:USERPROFILE\.claude\settings.json"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$bridgePath = Join-Path $scriptPath "devsprite-bridge.cmd"

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
                command = "$bridgePath tool_call --data `"$TOOL_INPUT`""
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
                command = "$bridgePath notification --data `"$MESSAGE`""
            }
        )
    }
)

# Save settings
$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath
Write-Host "Claude Code hooks installed successfully!"
Write-Host "Bridge path: $bridgePath"
```

- [ ] **步骤 2：Commit**

```bash
git add scripts/install-hooks.ps1
git commit -m "fix: update hook installer with correct bridge path"
```

---

## 任务 5：修复窗口拖拽功能

**文件：**
- 修改：`src/components/Widget.tsx`

- [ ] **步骤 1：更新 Widget.tsx 的拖拽实现**

```typescript
import React, { useCallback, useRef } from "react";
import { Mascot } from "./Mascot";
import { StatusCard } from "./StatusCard";
import { ToolList } from "./ToolList";
import { PermissionDialog } from "./PermissionDialog";
import { useAppStore } from "../stores/appStore";
import { useTauriEvent } from "../hooks/useTauriEvent";
import { getCurrentWindow } from "@tauri-apps/api/window";

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
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handleApprove = (id: string) => {
    removePermissionRequest(id);
  };

  const handleReject = (id: string) => {
    removePermissionRequest(id);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };

    const handleMouseMove = async (e: MouseEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;

      try {
        const window = getCurrentWindow();
        const pos = await window.outerPosition();
        await window.setPosition({
          x: pos.x + deltaX,
          y: pos.y + deltaY,
        });
      } catch (err) {
        console.error("Failed to move window:", err);
      }

      startPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <div
      className="glass-effect rounded-widget shadow-2xl overflow-hidden cursor-move"
      onMouseDown={handleMouseDown}
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
git commit -m "fix: update window drag for Tauri 2.x API"
```

---

## 任务 6：生产构建测试

**文件：**
- 修改：`package.json`（添加构建脚本）

- [ ] **步骤 1：更新 package.json 添加构建脚本**

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
    "tauri": "tauri",
    "tauri:build": "tauri build",
    "tauri:dev": "tauri dev"
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

- [ ] **步骤 2：构建生产版本**

```bash
cd G:/AI/project/devsprite
npm run tauri:build
```

预期：生成 `src-tauri/target/release/devsprite.exe`

- [ ] **步骤 3：验证构建产物**

```bash
ls -la src-tauri/target/release/devsprite.exe
```

预期：文件存在，大小约 5-10MB

- [ ] **步骤 4：Commit**

```bash
git add package.json
git commit -m "chore: add build scripts for production"
```

---

## 自检清单

### 1. 规格覆盖度

| 规格需求 | 对应任务 |
|----------|----------|
| 实时状态监控 | 任务 2 (Named Pipe) |
| 权限管理 | 任务 3 (桥接脚本) |
| 窗口拖拽 | 任务 5 |
| 吉祥物显示 | 任务 1 (重新裁剪) |
| 生产构建 | 任务 6 |

### 2. 占位符扫描

- ✅ 无 "待定"、"TODO"
- ✅ 所有代码步骤包含完整代码
- ✅ 所有命令包含精确命令

### 3. 类型一致性

- ✅ `SpriteStatus` 类型在所有文件中一致
- ✅ `DevSpriteEvent` 结构在 Rust 和 TypeScript 中一致

---

## 执行交接

计划已完成并保存到 `docs/superpowers/plans/2026-05-13-devsprite-completion.md`。

**两种执行方式：**

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点

**选哪种方式？**

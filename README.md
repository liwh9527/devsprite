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

import React, { useCallback, useState } from "react";
import { Mascot } from "./Mascot";
import { StatusCard } from "./StatusCard";
import { SessionSwitcher } from "./SessionSwitcher";
import { ToolList } from "./ToolList";
import { ChatHistory } from "./ChatHistory";
import { PermissionDialog } from "./PermissionDialog";
import { SettingsPanel } from "./SettingsPanel";
import { useAppStore, getActiveSession } from "../stores/appStore";
import { useTauriEvent } from "../hooks/useTauriEvent";
import { useWindowPosition } from "../hooks/useWindowPosition";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const Widget: React.FC = () => {
  useTauriEvent();
  useWindowPosition();

  const status = useAppStore((s) => getActiveSession(s)?.status ?? "idle");
  const statusMessage = useAppStore((s) => getActiveSession(s)?.statusMessage ?? "");
  const toolCalls = useAppStore((s) => getActiveSession(s)?.toolCalls ?? []);
  const chatMessages = useAppStore((s) => getActiveSession(s)?.chatMessages ?? []);
  const permissionRequests = useAppStore((s) => getActiveSession(s)?.permissionRequests ?? []);
  const settings = useAppStore((s) => s.settings);
  const loadSettings = useAppStore((s) => s.loadSettings);
  const isPinned = useAppStore((s) => s.isPinned);
  const setPinned = useAppStore((s) => s.setPinned);
  const clearToolCalls = useAppStore((s) => s.clearToolCalls);
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  const [showSettings, setShowSettings] = useState(false);
  const currentPermission = permissionRequests[0];

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    getCurrentWindow().startDragging();
  }, []);

  const handleSettingsClick = useCallback(() => {
    loadSettings();
    setShowSettings(true);
  }, [loadSettings]);

  return (
    <div className={`pet-container ${isPinned ? "pinned" : ""}`} onMouseDown={handleMouseDown}>
      {/* The pet - always visible */}
      <div className="pet-body">
        <Mascot status={status} />
      </div>

      {/* The panel - appears on hover */}
      <div className="pet-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div
          className="px-4 py-2 text-center rounded-t-xl"
          style={{
            background: `linear-gradient(to right, var(--color-primary), var(--color-primary-dark))`,
          }}
        >
          <div className="flex items-center justify-between">
            <h1 className="text-white font-bold text-sm">DevSprite</h1>
            <button
              onClick={() => setPinned(!isPinned)}
              className={`text-xs transition-colors ${isPinned ? 'text-white pin-active' : 'text-white/70 hover:text-white'}`}
              title={isPinned ? "取消锁定" : "锁定面板"}
            >
              {isPinned ? "📌" : "📍"}
            </button>
          </div>
        </div>

        <StatusCard status={status} message={statusMessage} connectionStatus={connectionStatus} />

        <div className="section-divider" />

        <SessionSwitcher />

        {/* 在 ToolList 之前添加标题 */}
        <div className="section-title">工具调用</div>

        <ToolList toolCalls={toolCalls} maxToolCalls={settings.behavior.max_tool_calls} onClear={clearToolCalls} />

        {/* 在 ChatHistory 之前添加标题 */}
        {chatMessages.length > 0 && (
          <>
            <div className="section-divider" />
            <div className="section-title">对话</div>
            <ChatHistory messages={chatMessages} />
          </>
        )}

        {/* 在 PermissionDialog 之前添加分隔线 */}
        {currentPermission && (
          <>
            <div className="section-divider" />
            <PermissionDialog
              request={currentPermission}
              timeout={settings.behavior.permission_timeout}
              queueLength={permissionRequests.length}
            />
          </>
        )}

        {/* 设置按钮改为带图标的样式 */}
        <div className="px-3 py-2 border-t border-gray-100">
          <button
            onClick={handleSettingsClick}
            className="w-full text-[10px] text-gray-400 hover:text-gray-600 py-1.5 flex items-center justify-center gap-1 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            设置
          </button>
        </div>
      </div>

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

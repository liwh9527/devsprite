import React, { useCallback, useState } from "react";
import { Mascot } from "./Mascot";
import { StatusCard } from "./StatusCard";
import { ToolList } from "./ToolList";
import { PermissionDialog } from "./PermissionDialog";
import { SettingsPanel } from "./SettingsPanel";
import { useAppStore } from "../stores/appStore";
import { useTauriEvent } from "../hooks/useTauriEvent";
import { useWindowPosition } from "../hooks/useWindowPosition";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const Widget: React.FC = () => {
  useTauriEvent();
  useWindowPosition();

  const {
    status,
    statusMessage,
    toolCalls,
    permissionRequests,
    loadSettings,
  } = useAppStore();

  const [showSettings, setShowSettings] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
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
              onClick={() => setIsPinned(!isPinned)}
              className="text-white/70 hover:text-white text-xs"
              title={isPinned ? "取消锁定" : "锁定面板"}
            >
              {isPinned ? "📌" : "📍"}
            </button>
          </div>
        </div>

        <StatusCard status={status} message={statusMessage} />

        <ToolList toolCalls={toolCalls} />

        {currentPermission && (
          <PermissionDialog request={currentPermission} />
        )}

        <div className="px-3 py-2 border-t border-gray-100">
          <button
            onClick={handleSettingsClick}
            className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
          >
            ⚙ 设置
          </button>
        </div>
      </div>

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

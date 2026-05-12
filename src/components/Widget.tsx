import React, { useCallback, useRef } from "react";
import { Mascot } from "./Mascot";
import { StatusCard } from "./StatusCard";
import { ToolList } from "./ToolList";
import { PermissionDialog } from "./PermissionDialog";
import { useAppStore } from "../stores/appStore";
import { useTauriEvent } from "../hooks/useTauriEvent";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalPosition } from "@tauri-apps/api/dpi";

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
        await window.setPosition(
          new LogicalPosition(pos.x + deltaX, pos.y + deltaY)
        );
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

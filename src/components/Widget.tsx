import React, { useCallback } from "react";
import { Mascot } from "./Mascot";
import { StatusCard } from "./StatusCard";
import { ToolList } from "./ToolList";
import { PermissionDialog } from "./PermissionDialog";
import { useAppStore } from "../stores/appStore";
import { useTauriEvent } from "../hooks/useTauriEvent";

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

  const handleApprove = (id: string) => {
    removePermissionRequest(id);
  };

  const handleReject = (id: string) => {
    removePermissionRequest(id);
  };

  const handleDrag = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // @ts-ignore - Tauri API
      window.__TAURI__?.window.appWindow.setPosition({
        x: deltaX,
        y: deltaY,
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <div
      className="glass-effect rounded-widget shadow-2xl overflow-hidden cursor-move"
      onMouseDown={handleDrag}
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

import React from "react";
import type { SpriteStatus, ConnectionStatus } from "../types";

interface StatusCardProps {
  status: SpriteStatus;
  message: string;
  connectionStatus?: ConnectionStatus;
}

const statusConfig: Record<
  SpriteStatus,
  { color: string; label: string; icon: string }
> = {
  idle: { color: "bg-gray-400", label: "空闲", icon: "😴" },
  active: { color: "bg-green-500", label: "活跃", icon: "😊" },
  working: { color: "bg-yellow-500", label: "工作中", icon: "🔧" },
  waiting: { color: "bg-blue-500", label: "等待中", icon: "👀" },
  error: { color: "bg-red-500", label: "错误", icon: "😵" },
};

export const StatusCard: React.FC<StatusCardProps> = ({ status, message, connectionStatus = "unknown" }) => {
  const config = statusConfig[status];

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${config.color} animate-pulse-slow`}
        />
        <span className="font-medium text-gray-800 text-xs">
          {config.label}{status !== "idle" && "..."}
        </span>
        {connectionStatus === "connected" && (
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full shrink-0 ml-auto" title="已连接" />
        )}
        {connectionStatus === "disconnected" && (
          <span className="text-[9px] text-red-400 ml-auto flex items-center gap-1" title="Claude Code 连接已断开">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
            断开
          </span>
        )}
      </div>
      {message && (
        <p className="text-[10px] text-gray-500 mt-1 ml-4 truncate" title={message}>
          {message}
        </p>
      )}
    </div>
  );
};

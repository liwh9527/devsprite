import React from "react";
import type { SpriteStatus } from "../types";

interface StatusCardProps {
  status: SpriteStatus;
  message: string;
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

export const StatusCard: React.FC<StatusCardProps> = ({ status, message }) => {
  const config = statusConfig[status];

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${config.color} animate-pulse-slow`}
        />
        <span className="font-medium text-gray-800 text-xs">
          {config.label}...
        </span>
      </div>
      {message && (
        <p className="text-[10px] text-gray-500 mt-1 ml-4 truncate">
          {message}
        </p>
      )}
    </div>
  );
};

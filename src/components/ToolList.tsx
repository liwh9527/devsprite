import React, { useState, useEffect } from "react";
import type { ToolCall } from "../types";
import { formatTime } from "../utils/formatTime";

interface ToolListProps {
  toolCalls: ToolCall[];
  maxToolCalls?: number;
  onClear?: () => void;
}

const toolIcons: Record<string, string> = {
  Read: "📄",
  Write: "✏️",
  Edit: "✏️",
  Grep: "🔍",
  Glob: "🔎",
  Bash: "💻",
};

const statusColors: Record<string, string> = {
  pending: "text-yellow-500",
  completed: "text-green-500",
  failed: "text-red-500",
};

export const ToolList: React.FC<ToolListProps> = ({ toolCalls, maxToolCalls = 5, onClear }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  if (toolCalls.length === 0) {
    return (
      <div className="px-3 py-2">
        <p className="text-[10px] text-gray-400 text-center">
          暂无工具调用记录
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 py-1">
      {onClear && (
        <div className="flex justify-end mb-0.5">
          <button
            onClick={onClear}
            className="text-[9px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            清空
          </button>
        </div>
      )}
      <div className="space-y-0.5">
        {toolCalls.slice(0, maxToolCalls).map((call) => (
          <div
            key={call.id}
            className="flex flex-col py-1 px-1.5 rounded hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span className={`text-xs shrink-0 ${statusColors[call.status] || ""}`}>
                {toolIcons[call.toolName] || "🔧"}
              </span>
              {call.status === "pending" && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0" />
              )}
              <span className="text-xs font-medium text-gray-800 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {call.toolName}
              </span>
              <span className="text-[10px] text-gray-500 shrink-0 ml-auto">
                {formatTime(call.timestamp)}
              </span>
            </div>
            {call.detail && (
              <span className="text-[9px] text-gray-400 truncate w-full pl-5" title={call.detail}>
                {call.detail.length > 30 ? call.detail.slice(0, 30) + "..." : call.detail}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

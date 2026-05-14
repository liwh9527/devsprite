import React from "react";
import type { ToolCall } from "../types";

interface ToolListProps {
  toolCalls: ToolCall[];
}

const toolIcons: Record<string, string> = {
  Read: "📄",
  Write: "✏️",
  Edit: "✏️",
  Grep: "🔍",
  Glob: "🔎",
  Bash: "💻",
};

function formatTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

export const ToolList: React.FC<ToolListProps> = ({ toolCalls }) => {
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
      <div className="space-y-0.5">
        {toolCalls.slice(0, 5).map((call) => (
          <div
            key={call.id}
            className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-gray-50 transition-colors"
          >
            <span className="text-xs shrink-0">
              {toolIcons[call.toolName] || "🔧"}
            </span>
            <span className="text-xs font-medium text-gray-800 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
              {call.toolName}
            </span>
            <span className="text-[10px] text-gray-500 shrink-0 ml-auto">
              {formatTime(call.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

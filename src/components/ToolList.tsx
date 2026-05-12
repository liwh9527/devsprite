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
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export const ToolList: React.FC<ToolListProps> = ({ toolCalls }) => {
  if (toolCalls.length === 0) {
    return (
      <div className="px-4 py-3">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 text-center">
            暂无工具调用记录
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="space-y-1">
        {toolCalls.map((call) => (
          <div
            key={call.id}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm">
              {toolIcons[call.toolName] || "🔧"}
            </span>
            <span className="text-sm font-medium text-gray-700 flex-1 truncate">
              {call.toolName}: {call.target.split("/").pop()}
            </span>
            <span className="text-xs text-gray-400">
              {formatTime(call.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

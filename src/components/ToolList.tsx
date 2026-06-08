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

const statusBg: Record<string, string> = {
  pending: "bg-yellow-50",
  completed: "",
  failed: "bg-red-50",
};

export const ToolList: React.FC<ToolListProps> = ({ toolCalls, maxToolCalls = 5, onClear }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
            className={`tool-item-enter flex flex-col py-1 px-1.5 rounded transition-colors ${statusBg[call.status] || "hover:bg-gray-50"}`}
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
              {call.target && (
                <span className="text-[9px] text-gray-400 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px]">
                  {call.target.split("/").pop()}
                </span>
              )}
              <span className="text-[10px] text-gray-500 shrink-0 ml-auto">
                {formatTime(call.timestamp)}
              </span>
            </div>
            {call.detail && (
              <button
                onClick={() => setExpandedId(expandedId === call.id ? null : call.id)}
                className="text-[9px] text-gray-400 text-left w-full pl-5 mt-0.5 hover:text-gray-600 transition-colors"
              >
                {expandedId === call.id ? (
                  <span className="break-words whitespace-pre-wrap">{call.detail}</span>
                ) : (
                  <span className="truncate block">
                    {call.detail.length > 40 ? call.detail.slice(0, 40) + "..." : call.detail}
                    {call.detail.length > 40 && <span className="text-gray-300 ml-1">▼</span>}
                  </span>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

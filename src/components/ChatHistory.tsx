import React from "react";
import type { ChatMessage } from "../types";

interface ChatHistoryProps {
  messages: ChatMessage[];
  maxMessages?: number;
}

function formatTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, maxMessages = 5 }) => {
  if (messages.length === 0) {
    return null;
  }

  const recentMessages = messages.slice(-maxMessages);

  return (
    <div className="px-3 py-1">
      <div className="space-y-1">
        {recentMessages.map((msg, idx) => (
          <div
            key={`${msg.timestamp}-${idx}`}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-2 py-1 rounded-lg text-[10px] leading-tight ${
                msg.role === "user"
                  ? "bg-gray-200 text-gray-700"
                  : "bg-blue-50 text-gray-700"
              }`}
              title={msg.content}
            >
              <span className="break-words line-clamp-2">{msg.content}</span>
              <span className="block text-[8px] text-gray-400 mt-0.5 text-right">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

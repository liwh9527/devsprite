import React, { useState, useEffect } from "react";
import type { ChatMessage } from "../types";
import { formatTime } from "../utils/formatTime";

interface ChatHistoryProps {
  messages: ChatMessage[];
  maxMessages?: number;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, maxMessages = 5 }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

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
            className={`tool-item-enter flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-2 py-1 rounded-lg text-[10px] leading-tight ${
                msg.role === "user"
                  ? "bg-indigo-100 text-indigo-800"
                  : "bg-gray-100 text-gray-700"
              }`}
              title={msg.content}
            >
              <span className="text-[8px] opacity-50 block mb-0.5">
                {msg.role === "user" ? "你" : "AI"}
              </span>
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

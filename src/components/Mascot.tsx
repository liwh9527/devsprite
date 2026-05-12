import React from "react";
import type { SpriteStatus } from "../types";

interface MascotProps {
  status: SpriteStatus;
}

const mascotEmojis: Record<SpriteStatus, string> = {
  idle: "😴",
  active: "😊",
  working: "🔧",
  waiting: "👀",
  error: "😵",
};

const mascotAnimations: Record<SpriteStatus, string> = {
  idle: "animate-bounce-slow",
  active: "animate-pulse-slow",
  working: "animate-spin-slow",
  waiting: "animate-bounce",
  error: "animate-shake",
};

export const Mascot: React.FC<MascotProps> = ({ status }) => {
  return (
    <div className="p-6 flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-50">
      <div
        className={`w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-6xl shadow-lg ${mascotAnimations[status]}`}
      >
        {mascotEmojis[status]}
      </div>
    </div>
  );
};

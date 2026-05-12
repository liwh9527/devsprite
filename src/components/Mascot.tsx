import React from "react";
import type { SpriteStatus } from "../types";

import idleImg from "../assets/mascot/idle.png";
import activeImg from "../assets/mascot/active.png";
import workingImg from "../assets/mascot/working.png";
import waitingImg from "../assets/mascot/waiting.png";
import errorImg from "../assets/mascot/error.png";

interface MascotProps {
  status: SpriteStatus;
}

const mascotImages: Record<SpriteStatus, string> = {
  idle: idleImg,
  active: activeImg,
  working: workingImg,
  waiting: waitingImg,
  error: errorImg,
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
    <div className="p-4 flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-50">
      <img
        src={mascotImages[status]}
        alt="DevSprite mascot"
        className={`w-40 h-40 object-contain ${mascotAnimations[status]}`}
      />
    </div>
  );
};

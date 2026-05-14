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

export const Mascot: React.FC<MascotProps> = ({ status }) => {
  return (
    <div className="flex items-end justify-center">
      <img
        src={mascotImages[status]}
        alt="DevSprite mascot"
        className={`h-[340px] w-auto mascot-${status}`}
        draggable={false}
      />
    </div>
  );
};

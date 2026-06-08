import React, { useCallback, useRef, useState } from "react";
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

type ReactionType = "click" | "double-click" | null;

export const Mascot: React.FC<MascotProps> = ({ status }) => {
  const [reaction, setReaction] = useState<ReactionType>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!mouseDownPos.current) return;
    const dx = e.clientX - mouseDownPos.current.x;
    const dy = e.clientY - mouseDownPos.current.y;
    mouseDownPos.current = null;

    // Only trigger reaction if mouse didn't move (click, not drag)
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) return;

    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setReaction("double-click");
      setTimeout(() => setReaction(null), 800);
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      setReaction("click");
      setTimeout(() => setReaction(null), 600);
    }, 250);
  }, []);

  return (
    <div className="flex items-end justify-center">
      <div
        className={`mascot-${status} mascot-react-${reaction ?? "none"}`}
        style={{ position: "relative", cursor: "pointer" }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <img
          src={mascotImages[status]}
          alt="DevSprite mascot"
          className="h-[200px] w-auto"
          draggable={false}
        />
        {/* Single click: floating hearts */}
        {reaction === "click" && (
          <>
            <span className="mascot-heart mascot-heart-1">💙</span>
            <span className="mascot-heart mascot-heart-2">💜</span>
            <span className="mascot-heart mascot-heart-3">💙</span>
          </>
        )}
        {/* Double click: star burst */}
        {reaction === "double-click" && (
          <>
            <span className="mascot-star mascot-star-1">✨</span>
            <span className="mascot-star mascot-star-2">⭐</span>
            <span className="mascot-star mascot-star-3">✨</span>
            <span className="mascot-star mascot-star-4">💫</span>
          </>
        )}
      </div>
    </div>
  );
};

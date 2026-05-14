import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

export function useWindowPosition() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unlisten = getCurrentWindow().onMoved(({ payload: position }) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        invoke("set_window_position", {
          x: position.x,
          y: position.y,
        }).catch(() => {
          // Silent failure
        });
      }, 500);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      unlisten.then((fn) => fn());
    };
  }, []);
}

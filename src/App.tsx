import React, { useEffect, useState } from "react";
import { Widget } from "./components/Widget";
import { useAppStore } from "./stores/appStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalPosition } from "@tauri-apps/api/dpi";

const App: React.FC = () => {
  const loadSettings = useAppStore((state) => state.loadSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSettings().then(() => {
      const { settings } = useAppStore.getState();
      getCurrentWindow().setPosition(
        new LogicalPosition(settings.window.x, settings.window.y)
      ).catch(() => {});
      setReady(true);
    });
  }, [loadSettings]);

  if (!ready) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen">
      <Widget />
    </div>
  );
};

export default App;

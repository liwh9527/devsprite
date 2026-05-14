import React, { useEffect } from "react";
import { Widget } from "./components/Widget";
import { useAppStore } from "./stores/appStore";

const App: React.FC = () => {
  const loadSettings = useAppStore((state) => state.loadSettings);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <div className="w-screen h-screen flex items-center justify-center p-4">
      <Widget />
    </div>
  );
};

export default App;

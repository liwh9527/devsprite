import React from "react";
import { Widget } from "./components/Widget";

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen flex items-center justify-center p-4">
      <Widget />
    </div>
  );
};

export default App;

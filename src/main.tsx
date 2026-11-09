import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import App from "./App";
import SettingsWindow from "./SettingsWindow";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import "./index.css";

const router = createHashRouter([
  {
    path: "/",
    element: (
      <ErrorBoundary fallbackTitle="播放器主視窗發生錯誤">
        <App />
      </ErrorBoundary>
    ),
    errorElement: <ErrorBoundary fallbackTitle="頁面路由載入失敗" />,
  },
  {
    path: "/settings",
    element: (
      <ErrorBoundary fallbackTitle="設定視窗發生錯誤">
        <SettingsWindow />
      </ErrorBoundary>
    ),
    errorElement: <ErrorBoundary fallbackTitle="設定路由載入失敗" />,
  },
]);

function Root() {
  useEffect(() => {
    const handleBlur = () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, []);

  return (
    <TooltipPrimitive.Provider
      delayDuration={200}
      skipDelayDuration={100}
      disableHoverableContent
    >
      <RouterProvider router={router} />
    </TooltipPrimitive.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

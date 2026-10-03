"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;

    function register() {
      void navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .catch((error: unknown) => {
          console.error(
            "Offline setup failed. It will retry when you reconnect.",
            error,
          );
        });
    }

    register();
    window.addEventListener("online", register);
    return () => window.removeEventListener("online", register);
  }, []);

  return null;
}

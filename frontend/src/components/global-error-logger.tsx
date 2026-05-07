"use client";

import { useEffect } from "react";

export function GlobalErrorLogger() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const onError = (event: ErrorEvent) => {
      const err = event.error;
      if (err instanceof Error) {
        console.error("[GlobalErrorLogger] window.error", err.message, err.stack);
        return;
      }
      console.error(
        "[GlobalErrorLogger] window.error",
        event.message,
        event.filename,
        event.lineno,
        event.colno,
      );
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason instanceof Error) {
        console.error(
          "[GlobalErrorLogger] unhandledrejection",
          reason.message,
          reason.stack,
        );
        return;
      }
      console.error("[GlobalErrorLogger] unhandledrejection", reason);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}


"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/sentry";

export default function ClientTelemetryBootstrap() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      void captureException(event.error ?? event.message, {
        source: "window.error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      void captureException(event.reason, {
        source: "window.unhandledrejection",
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}

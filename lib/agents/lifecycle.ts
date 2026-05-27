type ShutdownHandler = () => Promise<void> | void;

/**
 * Register a one-shot graceful-shutdown handler for SIGINT/SIGTERM (the signals
 * launchd and Ctrl+C deliver). Guarded so the handler runs at most once even if
 * both signals arrive.
 */
export function onShutdown(handler: ShutdownHandler): void {
  let handled = false;
  const run = async (signal: NodeJS.Signals) => {
    if (handled) {
      return;
    }
    handled = true;
    try {
      await handler();
    } catch (error) {
      console.error(`[lifecycle] shutdown handler error on ${signal}:`, error);
      process.exit(1);
    }
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      void run(signal);
    });
  }
}

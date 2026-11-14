export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateServerEnv } = await import("@/lib/env");
    validateServerEnv();

    const { startTelegramBackgroundPoller } = await import("@/lib/telegramPoller");
    startTelegramBackgroundPoller();
  }
}

import prisma from "@/lib/prisma";
import {
  getTelegramConfig,
  getTelegramWebhookInfo,
  handleTelegramCallbackQuery,
} from "@/lib/telegram";

declare global {
  // Prevent multiple poller instances during Next.js hot module reloading
  var __telegramPollerActive: boolean | undefined;
}

/**
 * Resilient background long-polling service for Telegram Bot actions.
 * Runs autonomously on the Node.js server.
 * Enables instant (<150ms) reaction to Telegram inline buttons on localhost
 * and servers without requiring an external public webhook tunnel.
 */
export function startTelegramBackgroundPoller() {
  if (global.__telegramPollerActive) {
    return;
  }
  global.__telegramPollerActive = true;

  // Run asynchronously without blocking server startup
  (async () => {
    console.log("🤖 [Telegram Poller] Background daemon initiated.");

    let lastOffset = 0;

    // Load initial offset from DB if stored
    try {
      const offsetRecord = await prisma.storeSetting.findUnique({
        where: { key: "telegram_last_update_id" },
      });
      if (offsetRecord?.value) {
        lastOffset = parseInt(offsetRecord.value, 10) || 0;
      }
    } catch {}

    while (true) {
      try {
        const config = await getTelegramConfig();

        // If Telegram is not enabled or credentials are missing, sleep and recheck
        if (!config.enabled || !config.botToken) {
          await sleep(6000);
          continue;
        }

        const token = config.botToken;

        // Check if an external webhook is already registered with Telegram
        const webhookInfo = await getTelegramWebhookInfo(token);
        if (webhookInfo?.url) {
          // If a public webhook is registered, Telegram will push callbacks to /api/telegram/webhook.
          // Sleep and let the webhook handle updates without conflict.
          await sleep(15000);
          continue;
        }

        // Long-poll Telegram for callback_query updates (timeout=20 seconds)
        // Telegram holds the connection open and returns IMMEDIATELY when a button is clicked.
        const pollUrl = `https://api.telegram.org/bot${token}/getUpdates?offset=${
          lastOffset + 1
        }&limit=50&timeout=20&allowed_updates=${encodeURIComponent(
          JSON.stringify(["callback_query"])
        )}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 28000);

        const res = await fetch(pollUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        const json = await res.json();

        if (json.ok && Array.isArray(json.result)) {
          for (const update of json.result) {
            if (update.update_id > lastOffset) {
              lastOffset = update.update_id;
            }

            if (update.callback_query) {
              try {
                await handleTelegramCallbackQuery(update.callback_query);
              } catch (handlerErr) {
                console.error("Error processing callback query:", handlerErr);
              }
            }
          }

          // Persist latest acknowledged update ID
          if (json.result.length > 0) {
            prisma.storeSetting
              .upsert({
                where: { key: "telegram_last_update_id" },
                update: { value: String(lastOffset) },
                create: { key: "telegram_last_update_id", value: String(lastOffset) },
              })
              .catch(() => {});
          }
        } else if (json.error_code === 409) {
          // Another instance is polling or webhook conflict
          await sleep(5000);
        } else {
          await sleep(2000);
        }
      } catch (loopError: any) {
        // Network timeout / connection reset / fetch abort - normal during long polling
        if (loopError.name !== "AbortError") {
          console.warn("Telegram polling loop notice:", loopError.message || loopError);
        }
        await sleep(2000);
      }
    }
  })().catch((fatal) => {
    console.error("Fatal error in Telegram Poller:", fatal);
    global.__telegramPollerActive = false;
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

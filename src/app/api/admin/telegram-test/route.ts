import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { testTelegramBot, getTelegramConfig } from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin("settings");
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { botToken, chatId } = body;

    const storedConfig = await getTelegramConfig();
    const effectiveToken =
      typeof botToken === "string" && botToken.trim() && !botToken.includes("••••")
        ? botToken.trim()
        : storedConfig.botToken;

    if (!effectiveToken) {
      return NextResponse.json(
        { error: "Please enter your Telegram Bot Token." },
        { status: 400 }
      );
    }

    if (!chatId || typeof chatId !== "string" || !chatId.trim()) {
      return NextResponse.json(
        { error: "Please enter your Telegram Chat ID." },
        { status: 400 }
      );
    }

    const result = await testTelegramBot(effectiveToken, chatId.trim());

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            result.error ||
            "Failed to send test message. Check your bot token and chat ID.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test message sent successfully to your Telegram!",
    });
  } catch (error: any) {
    console.error("Telegram test failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send test message." },
      { status: 500 }
    );
  }
}

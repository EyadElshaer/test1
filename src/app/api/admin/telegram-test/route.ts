import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { testTelegramBot } from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { botToken, chatId } = body;

    if (!botToken || typeof botToken !== "string" || !botToken.trim()) {
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

    const result = await testTelegramBot(botToken.trim(), chatId.trim());

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

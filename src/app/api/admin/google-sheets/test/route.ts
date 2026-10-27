import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { testGoogleSheetsWebhook } from "@/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { webhookUrl } = body;

    const result = await testGoogleSheetsWebhook(webhookUrl);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Connection test failed." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message || "Connected to Google Sheets successfully!",
    });
  } catch (error: any) {
    console.error("Google Sheets test route error:", error);
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}

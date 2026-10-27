import { NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/auth";
import { syncAllOrdersToGoogleSheets } from "@/lib/googleSheets";

export async function POST() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncAllOrdersToGoogleSheets();

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Batch sync failed." }, { status: 400 });
    }

    await logAdminAudit(
      admin.id,
      "GOOGLE_SHEETS_SYNC",
      `Batch synced ${result.count} orders to Google Sheets.`
    );

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Successfully synced ${result.count} orders to Google Sheets.`,
    });
  } catch (error: any) {
    console.error("Google Sheets sync-all route error:", error);
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}

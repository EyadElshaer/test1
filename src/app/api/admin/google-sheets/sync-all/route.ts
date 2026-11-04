import { NextResponse } from "next/server";
import { requireAdmin, hasAdminPermission, logAdminAudit } from "@/lib/auth";
import { syncAllOrdersToGoogleSheets } from "@/lib/googleSheets";

export async function POST() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;
    if (
      !hasAdminPermission(admin, "settings") &&
      !hasAdminPermission(admin, "orders")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

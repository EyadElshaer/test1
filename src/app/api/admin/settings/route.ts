import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.storeSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (error) {
    console.error("Failed to load settings:", error);
    return NextResponse.json({ error: "Failed to load store settings." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      if (typeof key === "string" && typeof value === "string") {
        await prisma.storeSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    }

    await logAdminAudit(admin.id, "SETTINGS_UPDATED", "Store configuration settings updated");

    return NextResponse.json({ success: true, message: "Settings saved successfully." });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json({ error: "Failed to update settings." }, { status: 500 });
  }
}

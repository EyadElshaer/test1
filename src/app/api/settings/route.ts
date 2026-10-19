import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.storeSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (error) {
    console.error("Failed to load public settings:", error);
    return NextResponse.json({ error: "Failed to load store settings." }, { status: 500 });
  }
}

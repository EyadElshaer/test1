import { NextResponse } from "next/server";
import { destroyUserSession } from "@/lib/userAuth";

export async function POST() {
  try {
    await destroyUserSession();
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Failed to log out" }, { status: 500 });
  }
}

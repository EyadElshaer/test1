import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/userAuth";

export async function GET() {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    console.error("Error in auth/me:", error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}

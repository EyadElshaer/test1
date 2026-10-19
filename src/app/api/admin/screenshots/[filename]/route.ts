import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAdminSession } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return new NextResponse("Unauthorized: Administrator session required.", { status: 401 });
    }

    const { filename } = await params;
    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), "storage", "screenshots", safeFilename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Screenshot not found.", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error reading screenshot:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

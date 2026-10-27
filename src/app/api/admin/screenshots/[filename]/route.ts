import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const safeFilename = path.basename(filename);

    // Strictly require active administrator session to access customer payment proof receipts
    const admin = await getAdminSession();
    if (!admin) {
      return new NextResponse("Unauthorized: Administrator session required.", { status: 401 });
    }

    // 1. Try PostgreSQL database first (primary storage for persistent serverless environments)
    try {
      const dbFile = await prisma.uploadedFile.findUnique({
        where: { filename: safeFilename },
      });

      if (dbFile && dbFile.data) {
        return new NextResponse(new Uint8Array(dbFile.data), {
          headers: {
            "Content-Type": dbFile.mimeType || "image/jpeg",
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    } catch (dbErr) {
      console.warn("Database lookup error for screenshot:", dbErr);
    }

    // 2. Fallback to local storage on disk if present
    const filePath = path.join(process.cwd(), "storage", "screenshots", safeFilename);
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(safeFilename).toLowerCase();
      const contentType =
        ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return new NextResponse("Screenshot not found.", { status: 404 });
  } catch (error) {
    console.error("Error reading screenshot:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}


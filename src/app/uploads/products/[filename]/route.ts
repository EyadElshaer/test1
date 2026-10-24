import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const safeFilename = path.basename(filename);

    // 1. Check database storage
    try {
      const dbFile = await prisma.uploadedFile.findUnique({
        where: { filename: safeFilename },
      });

      if (dbFile && dbFile.data) {
        return new NextResponse(new Uint8Array(dbFile.data), {
          headers: {
            "Content-Type": dbFile.mimeType || "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    } catch (dbError) {
      console.warn("DB media lookup failed:", dbError);
    }

    // 2. Check local disk fallback
    const localPath = path.join(process.cwd(), "public", "uploads", "products", safeFilename);
    if (fs.existsSync(/*turbopackIgnore: true*/ localPath)) {
      const fileBuffer = fs.readFileSync(/*turbopackIgnore: true*/ localPath);
      const ext = path.extname(safeFilename).toLowerCase();
      const contentType =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
          ? "image/gif"
          : "image/jpeg";

      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return new NextResponse("Not Found", { status: 404 });
  } catch (error) {
    console.error("Error serving upload:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

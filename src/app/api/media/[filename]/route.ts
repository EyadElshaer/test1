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

    // Security check: Private payment screenshots (proof_*) must NOT be served via public media endpoint
    if (safeFilename.startsWith("proof_")) {
      return new NextResponse("Not found", { status: 404 });
    }

    // 1. Try PostgreSQL database storage first (only product images and public catalog assets)
    try {
      const dbFile = await prisma.uploadedFile.findUnique({
        where: { filename: safeFilename },
      });

      if (dbFile && dbFile.data && dbFile.category !== "screenshot") {
        return new NextResponse(dbFile.data, {
          headers: {
            "Content-Type": dbFile.mimeType || "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    } catch (dbError) {
      console.warn("Database lookup failed for media:", dbError);
    }

    // 2. Fallback to local filesystem if available (e.g. public/uploads/products)
    const localPaths = [
      path.join(process.cwd(), "public", "uploads", "products", safeFilename),
      path.join(process.cwd(), "public", "uploads", safeFilename),
      path.join(process.cwd(), "public", "images", safeFilename),
    ];

    for (const p of localPaths) {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
        const fileBuffer = fs.readFileSync(/*turbopackIgnore: true*/ p);
        const ext = path.extname(safeFilename).toLowerCase();
        const contentType =
          ext === ".png"
            ? "image/png"
            : ext === ".webp"
            ? "image/webp"
            : ext === ".gif"
            ? "image/gif"
            : "image/jpeg";

        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    return new NextResponse("Image not found", { status: 404 });
  } catch (error) {
    console.error("Error serving media:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

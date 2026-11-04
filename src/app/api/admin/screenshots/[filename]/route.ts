import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAdmin, hasAdminPermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sanitizeFilename } from "@/lib/sanitizer";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const safeFilename = sanitizeFilename(path.basename(filename));
    if (!safeFilename || !/^proof_[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(safeFilename)) {
      return new NextResponse("Invalid screenshot filename.", { status: 400 });
    }

    // Strictly require active administrator session with orders, refunds, or customers permission
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return auth.response;
    }
    const admin = auth.admin;
    if (
      !hasAdminPermission(admin, "orders") &&
      !hasAdminPermission(admin, "refunds") &&
      !hasAdminPermission(admin, "customers")
    ) {
      return new NextResponse("Forbidden: Insufficient permissions to view payment proofs.", {
        status: 403,
      });
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
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
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
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
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


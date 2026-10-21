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
    const url = new URL(req.url);
    const orderNumber = url.searchParams.get("orderNumber");
    const phone = url.searchParams.get("phone");

    if (!orderNumber) {
      return new NextResponse("Unauthorized: Order number is required.", { status: 401 });
    }

    const safeFilename = path.basename(filename);
    const order = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order || !order.paymentScreenshotUrl?.includes(safeFilename)) {
      return new NextResponse("Not found or unauthorized.", { status: 404 });
    }

    // If phone is provided, verify match (preventing guessing order number)
    if (phone && order.customerPhone.replace(/\D/g, "") !== phone.replace(/\D/g, "")) {
      return new NextResponse("Unauthorized: Verification failed.", { status: 403 });
    }

    // 1. Check database storage
    try {
      const dbFile = await prisma.uploadedFile.findUnique({
        where: { filename: safeFilename },
      });
      if (dbFile && dbFile.data) {
        return new NextResponse(new Uint8Array(dbFile.data), {
          headers: {
            "Content-Type": dbFile.mimeType || "image/jpeg",
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    } catch (e) {
      console.warn("DB lookup error:", e);
    }

    // 2. Fallback to local storage on disk
    const filePath = path.join(process.cwd(), "storage", "screenshots", safeFilename);
    if (!fs.existsSync(filePath)) {
      return new NextResponse("Screenshot file not found.", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving customer screenshot:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

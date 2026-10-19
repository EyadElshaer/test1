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

    const filePath = path.join(process.cwd(), "storage", "screenshots", safeFilename);
    if (!fs.existsSync(filePath)) {
      return new NextResponse("Screenshot file not found on disk.", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

    return new NextResponse(fileBuffer, {
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

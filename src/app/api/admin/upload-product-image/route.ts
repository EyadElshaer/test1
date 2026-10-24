import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isValidImageBuffer } from "@/lib/sanitizer";

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF images are allowed." }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Image size must be less than 15MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Deep Magic Byte Validation
    const magicCheck = isValidImageBuffer(buffer);
    if (!magicCheck.valid) {
      return NextResponse.json(
        { error: "Invalid image content. File signature does not match image format." },
        { status: 400 }
      );
    }

    const actualMime = magicCheck.detectedMime || file.type || "image/jpeg";
    const ext =
      actualMime === "image/png"
        ? ".png"
        : actualMime === "image/webp"
        ? ".webp"
        : actualMime === "image/gif"
        ? ".gif"
        : ".jpg";

    const filename = `prod_${Date.now()}_${crypto.randomBytes(8).toString("hex")}${ext}`;

    // 1. Persist to PostgreSQL database (works across Vercel, serverless, and local)
    await prisma.uploadedFile.create({
      data: {
        filename,
        mimeType: actualMime,
        data: buffer,
        size: buffer.length,
        category: "product_image",
      },
    });

    // 2. Best-effort write to local filesystem if writable
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "products");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buffer);
    } catch (fsErr) {
      console.warn("Local disk write skipped (read-only environment):", fsErr);
    }

    return NextResponse.json({
      success: true,
      url: `/api/media/${filename}`,
    });
  } catch (error: any) {
    console.error("Product image upload failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to upload product image." }, { status: 500 });
  }
}

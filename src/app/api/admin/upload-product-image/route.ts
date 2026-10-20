import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF images are allowed." }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Image size must be less than 15MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || (file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg");
    const filename = `prod_${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext}`;

    // 1. Persist to PostgreSQL database (works across Vercel, serverless, and local)
    await prisma.uploadedFile.create({
      data: {
        filename,
        mimeType: file.type || "image/jpeg",
        data: buffer,
        size: buffer.length,
        category: "product_image",
      },
    });

    // 2. Best-effort write to local filesystem if writable (will not crash if read-only)
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "products");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buffer);
    } catch (fsErr) {
      // Ignore read-only filesystem errors in cloud/serverless environments
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

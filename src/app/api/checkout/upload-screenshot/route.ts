import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import prisma from "@/lib/prisma";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB allowance (client compresses before upload)
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("screenshot") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No screenshot file provided." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP images are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the limit. Please upload a smaller screenshot." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `proof_${Date.now()}_${crypto.randomBytes(12).toString("hex")}.${ext}`;

    // 1. Persist screenshot reliably to PostgreSQL database
    await prisma.uploadedFile.create({
      data: {
        filename,
        mimeType: file.type || "image/jpeg",
        data: buffer,
        size: buffer.length,
        category: "screenshot",
      },
    });

    // 2. Best-effort write to local filesystem if writable
    try {
      const storageDir = path.join(process.cwd(), "storage", "screenshots");
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }
      const filePath = path.join(storageDir, filename);
      fs.writeFileSync(filePath, buffer);
    } catch (fsErr) {
      console.warn("Storage directory write skipped (read-only environment):", fsErr);
    }

    return NextResponse.json({
      success: true,
      fileKey: filename,
      url: `/api/admin/screenshots/${filename}`,
    });
  } catch (error: any) {
    console.error("Screenshot upload failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to upload payment screenshot." }, { status: 500 });
  }
}

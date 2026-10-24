import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { isValidImageBuffer } from "@/lib/sanitizer";
import { getClientIp } from "@/lib/security";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB allowance
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // Rate limit: max 12 uploads per 10 minutes per IP
    const rateCheck = checkRateLimit(`upload_screenshot_${ip}`, 12, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many upload attempts. Please wait ${rateCheck.retryAfterSec} seconds before trying again.` },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("screenshot") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No screenshot file provided." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
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

    // Deep Magic Byte / File Signature Validation (prevents file spoofing & web shells)
    const magicCheck = isValidImageBuffer(buffer);
    if (!magicCheck.valid) {
      return NextResponse.json(
        { error: "File validation failed: The file content does not match a valid image format." },
        { status: 400 }
      );
    }

    const actualMime = magicCheck.detectedMime || file.type || "image/jpeg";
    const ext = actualMime === "image/png" ? "png" : actualMime === "image/webp" ? "webp" : "jpg";
    const filename = `proof_${Date.now()}_${crypto.randomBytes(12).toString("hex")}.${ext}`;

    // 1. Persist screenshot reliably to PostgreSQL database
    await prisma.uploadedFile.create({
      data: {
        filename,
        mimeType: actualMime,
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

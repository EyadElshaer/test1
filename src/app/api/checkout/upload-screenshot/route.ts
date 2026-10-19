import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

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
        { error: "File size exceeds the 8MB limit. Please upload a smaller screenshot." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Private storage directory outside of /public
    const storageDir = path.join(process.cwd(), "storage", "screenshots");
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `proof_${Date.now()}_${crypto.randomBytes(12).toString("hex")}.${ext}`;
    const filePath = path.join(storageDir, filename);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      fileKey: filename,
      url: `/api/admin/screenshots/${filename}`,
    });
  } catch (error) {
    console.error("Screenshot upload failed:", error);
    return NextResponse.json({ error: "Failed to upload payment screenshot." }, { status: 500 });
  }
}

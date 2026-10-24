import path from "path";

/**
 * Security & Input Sanitization Utilities
 * Prevents XSS, Code Injection, Path Traversal, and MIME Spoofing
 */

/**
 * Remove any dangerous HTML tags, javascript pseudo-protocols, and control characters.
 */
export function sanitizeString(input: unknown, maxLength: number = 1000): string {
  if (typeof input !== "string") return "";

  // 1. Remove null bytes and control characters (except newline \n and carriage return \r)
  let clean = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 2. Strip HTML tags: <script>, <iframe>, <object>, <embed>, <style>, <link>, etc.
  clean = clean.replace(/<[^>]*>?/gm, "");

  // 3. Remove common XSS injection vectors & javascript: pseudo protocols
  clean = clean.replace(/javascript:/gi, "");
  clean = clean.replace(/vbscript:/gi, "");
  clean = clean.replace(/data:text\/html/gi, "");
  clean = clean.replace(/on\w+\s*=/gi, ""); // e.g. onclick=, onerror=

  // 4. Trim and clamp max length
  clean = clean.trim();
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }

  return clean;
}

/**
 * Strip script and dangerous tags while preserving safe text entities
 */
export function sanitizeText(input: unknown, maxLength: number = 2000): string {
  if (typeof input !== "string") return "";
  return sanitizeString(input, maxLength);
}

/**
 * Sanitize filenames to prevent Path Traversal attacks (e.g. ../../etc/passwd)
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== "string") return "";

  // Extract base filename only
  let safe = path.basename(filename.trim());

  // Remove dangerous path navigation characters and null bytes
  safe = safe.replace(/[\x00-\x1F\x7F]/g, "");
  safe = safe.replace(/\.\.+/g, "."); // Disallow multiple dots (e.g. ..)
  safe = safe.replace(/[^a-zA-Z0-9_\-\.]/g, "_"); // Allow only alphanumeric, dash, underscore, dot

  // Avoid hidden files starting with dot
  if (safe.startsWith(".")) {
    safe = "_" + safe.slice(1);
  }

  return safe || "file_" + Date.now();
}

/**
 * Validate image buffer using Magic Bytes (File Signatures).
 * Prevents attackers from uploading executable files (e.g. .php, .sh, .html) disguised with image extensions.
 */
export function isValidImageBuffer(buffer: Buffer): { valid: boolean; detectedMime?: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false };
  }

  // JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png" };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, detectedMime: "image/webp" };
  }

  // GIF: GIF87a or GIF89a (47 49 46 38 37 61 or 47 49 46 38 39 61)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { valid: true, detectedMime: "image/gif" };
  }

  return { valid: false };
}

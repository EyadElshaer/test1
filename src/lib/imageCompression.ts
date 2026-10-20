/**
 * Client-side high performance image compression utility.
 * Optimizes images for fast upload, low memory on low-end hardware/phones,
 * and staying well below serverless payload limits.
 */

export async function compressImageForUpload(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85
): Promise<File> {
  // If not in browser or not an image, return original
  if (typeof window === "undefined" || !file || !file.type.startsWith("image/")) {
    return file;
  }

  // If already very small (e.g. < 250KB), no need to compress heavily unless requested
  if (file.size < 250 * 1024 && !file.type.includes("bmp") && !file.type.includes("tiff")) {
    return file;
  }

  // GIFs might be animated; do not re-encode to maintain frames
  if (file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;

            // Calculate scaled dimensions
            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(file);
              return;
            }

            // High quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            // Export as webp if supported, or fallback to jpeg
            const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";

            canvas.toBlob(
              (blob) => {
                if (!blob || blob.size >= file.size) {
                  // If compressed version is somehow larger or failed, return original
                  resolve(file);
                  return;
                }

                const compressedFile = new File([blob], file.name, {
                  type: outputType,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              },
              outputType,
              quality
            );
          } catch {
            resolve(file);
          }
        };

        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };

      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch {
      resolve(file);
    }
  });
}

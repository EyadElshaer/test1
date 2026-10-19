from PIL import Image, ImageChops, ImageFilter

# Load original logo
orig = Image.open(r"C:\Users\ayman\.gemini\antigravity-ide\brain\b776fd86-4b7d-485a-8e5a-c0683731225e\.user_uploaded\media_1792282598920.png").convert("RGBA")
w, h = orig.size

# Background is (0, 13, 84)
bg = Image.new("RGBA", (w, h), (0, 13, 84, 255))
diff = ImageChops.difference(orig, bg).convert("L")

# Threshold diff to find logo bounds
# Pixels with difference > 20 are definitely part of the logo
mask = diff.point(lambda p: 255 if p > 22 else 0)
bbox = mask.getbbox()
print("Logo Bounding Box:", bbox)

# Create smooth alpha channel
# Small blur on difference for antialiased edges
alpha = diff.point(lambda p: min(255, int(max(0, p - 10) * (255 / 25))))
alpha = alpha.filter(ImageFilter.SMOOTH)

# Apply alpha to original image
r, g, b, _ = orig.split()
transparent_im = Image.merge("RGBA", (r, g, b, alpha))

# Crop tightly with a small 16px padding for visual breathing room
if bbox:
    pad = 16
    crop_box = (
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(w, bbox[2] + pad),
        min(h, bbox[3] + pad)
    )
    cropped = transparent_im.crop(crop_box)
else:
    cropped = transparent_im

print("Cropped logo size:", cropped.size)

# Save to public directories
cropped.save("public/images/premikeys-logo.png", "PNG")
cropped.save("public/logo.png", "PNG")
print("Successfully generated transparent logo!")

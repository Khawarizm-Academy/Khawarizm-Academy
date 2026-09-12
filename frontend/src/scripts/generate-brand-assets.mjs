import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src/scripts → src
const SRC_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.resolve(SRC_DIR, "..", "public");

// Master brand logo (Single Source of Truth)
const SOURCE = path.join(
    SRC_DIR,
    "assets",
    "brand",
    "source",
    "KhawarizmLogo.jpg"
);

// Generated assets output directory
const OUTPUT = path.join(
    SRC_DIR,
    "assets",
    "brand",
    "generated"
);

// Relative paths for display
const RELATIVE_SOURCE = path.relative(path.resolve(SRC_DIR, ".."), SOURCE);
const RELATIVE_OUTPUT = path.relative(path.resolve(SRC_DIR, ".."), OUTPUT);

async function generateBrandAssets() {
    // 1. Verify master source exists before starting
    try {
        await fs.access(SOURCE);
    } catch {
        console.error(`\n❌ Error: Master brand logo not found at:`);
        console.error(`   ${SOURCE}\n`);
        console.error(`Please place the academy's master logo at:`);
        console.error(`   src/assets/brand/source/KhawarizmLogo.jpg\n`);
        process.exit(1);
    }

    // 2. Ensure output directory exists
    await fs.mkdir(OUTPUT, { recursive: true });
    await fs.mkdir(PUBLIC_DIR, { recursive: true });

    console.log("🎨 Generating academy brand assets...\n");
    console.log(`Source:\n${RELATIVE_SOURCE}\n`);
    console.log(`Output:\n${RELATIVE_OUTPUT}/\n`);

    // Brand background color tokens (#040F24)
    const BRAND_NAVY = { r: 4, g: 15, b: 36, alpha: 1 };

    // --------------------------------------------------
    // 1. Main logo (PNG) — fit: inside, preserve aspect ratio
    // --------------------------------------------------
    await sharp(SOURCE)
        .resize({
            width: 800,
            fit: "inside",
            withoutEnlargement: false,
        })
        .png()
        .toFile(path.join(OUTPUT, "logo.png"));
    console.log("✓ logo.png");

    // --------------------------------------------------
    // 2. Web-optimized logo (WebP)
    // --------------------------------------------------
    await sharp(SOURCE)
        .resize({
            width: 800,
            fit: "inside",
            withoutEnlargement: false,
        })
        .webp({ quality: 90 })
        .toFile(path.join(OUTPUT, "logo.webp"));
    console.log("✓ logo.webp");

    // --------------------------------------------------
    // 3. Platform Icon (512x512)
    // --------------------------------------------------
    await sharp(SOURCE)
        .resize(512, 512, {
            fit: "cover",
            position: "centre",
        })
        .png()
        .toFile(path.join(OUTPUT, "icon-512.png"));
    console.log("✓ icon-512.png");

    // --------------------------------------------------
    // 4. PWA / App Icon (192x192)
    // --------------------------------------------------
    await sharp(SOURCE)
        .resize(192, 192, {
            fit: "cover",
            position: "centre",
        })
        .png()
        .toFile(path.join(OUTPUT, "icon-192.png"));
    console.log("✓ icon-192.png");

    // --------------------------------------------------
    // 5. Apple Touch Icon (180x180)
    // --------------------------------------------------
    await sharp(SOURCE)
        .resize(180, 180, {
            fit: "cover",
            position: "centre",
        })
        .png()
        .toFile(path.join(OUTPUT, "apple-touch-icon.png"));
    console.log("✓ apple-touch-icon.png");

    // --------------------------------------------------
    // 6. Favicon 32x32
    // --------------------------------------------------
    await sharp(SOURCE)
        .resize(32, 32, {
            fit: "cover",
            position: "centre",
        })
        .png()
        .toFile(path.join(OUTPUT, "favicon-32.png"));
    console.log("✓ favicon-32.png");

    // --------------------------------------------------
    // 7. Favicon 16x16
    // --------------------------------------------------
    await sharp(SOURCE)
        .resize(16, 16, {
            fit: "cover",
            position: "centre",
        })
        .png()
        .toFile(path.join(OUTPUT, "favicon-16.png"));
    console.log("✓ favicon-16.png");

    // --------------------------------------------------
    // 8. Loading Screen Logo (max 300px)
    // --------------------------------------------------
    await sharp(SOURCE)
        .resize({
            width: 300,
            height: 300,
            fit: "inside",
        })
        .png()
        .toFile(path.join(OUTPUT, "loading-logo.png"));
    console.log("✓ loading-logo.png");

    // --------------------------------------------------
    // 9. Open Graph / Social Preview (1200x630)
    // --------------------------------------------------
    await sharp(SOURCE)
        .resize(1200, 630, {
            fit: "contain",
            background: BRAND_NAVY,
        })
        .jpeg({ quality: 95 })
        .toFile(path.join(OUTPUT, "og-image.jpg"));
    console.log("✓ og-image.jpg");

    // --------------------------------------------------
    // 10. Sync public assets for root browser availability
    // --------------------------------------------------
    const publicSyncFiles = [
        "favicon-32.png",
        "favicon-16.png",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
        "og-image.jpg",
    ];

    for (const file of publicSyncFiles) {
        await fs.copyFile(
            path.join(OUTPUT, file),
            path.join(PUBLIC_DIR, file)
        );
    }

    console.log("\n✅ Brand assets generated successfully!\n");
}

generateBrandAssets().catch((err) => {
    console.error("❌ Unexpected error during brand asset generation:", err);
    process.exit(1);
});
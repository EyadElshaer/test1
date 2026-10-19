import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Updating catalog to 100% Genuine Software & Windows licenses...");

  // 1. Archive any old game products
  await prisma.product.updateMany({
    where: {
      slug: {
        in: [
          "cyberpunk-2077-ultimate-edition-steam",
          "ea-sports-fc-25-ea-app-key",
          "xbox-game-pass-ultimate-3-months",
          "red-dead-redemption-2-pc-key",
          "test",
        ],
      },
    },
    data: {
      isArchived: true,
      isPublished: false,
      isFeatured: false,
    },
  });

  // Archive old gaming categories
  await prisma.category.updateMany({
    where: {
      slug: { in: ["pc-games", "subscriptions"] },
    },
    data: { isActive: false },
  });

  // 2. Upsert Professional Software Categories
  const softwareCategories = [
    {
      name: "Windows & Operating Systems",
      slug: "windows-office",
      description: "Official OEM & Retail product keys for Windows 11 Pro, Windows 10 Pro, and Windows Server.",
      displayOrder: 1,
      isFeatured: true,
      isActive: true,
      image: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Microsoft Office & Productivity",
      slug: "office-productivity",
      description: "Lifetime desktop suites for Word, Excel, PowerPoint, Outlook, and Microsoft 365.",
      displayOrder: 2,
      isFeatured: true,
      isActive: true,
      image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Cybersecurity & Antivirus",
      slug: "software-security",
      description: "Top-tier endpoint defense, password vaults, and privacy utilities from Kaspersky and Bitdefender.",
      displayOrder: 3,
      isFeatured: true,
      isActive: true,
      image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Creative & Developer Tools",
      slug: "creative-developer",
      description: "Professional creative suites, IDE tools, and cloud developer licenses.",
      displayOrder: 4,
      isFeatured: true,
      isActive: true,
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const catMap: Record<string, string> = {};
  for (const c of softwareCategories) {
    const upserted = await prisma.category.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
    catMap[c.slug] = upserted.id;
  }

  // 3. Update dynamic filter groups to software attributes
  const platformGroup = await prisma.filterGroup.upsert({
    where: { attributeKey: "platform" },
    update: { label: "Platform / OS" },
    create: {
      label: "Platform / OS",
      attributeKey: "platform",
      filterType: "CHECKBOX",
      displayOrder: 1,
      isActive: true,
    },
  });

  const platformOptions = [
    { label: "Windows 11", value: "Windows 11", displayOrder: 1 },
    { label: "Windows 10", value: "Windows 10", displayOrder: 2 },
    { label: "Windows Server", value: "Windows Server", displayOrder: 3 },
    { label: "Multi-Platform", value: "Multi-OS", displayOrder: 4 },
  ];

  for (const opt of platformOptions) {
    const existing = await prisma.filterOption.findFirst({
      where: { filterGroupId: platformGroup.id, value: opt.value },
    });
    if (!existing) {
      await prisma.filterOption.create({
        data: {
          filterGroupId: platformGroup.id,
          label: opt.label,
          value: opt.value,
          displayOrder: opt.displayOrder,
        },
      });
    }
  }

  // Helper discount math
  const calcDiscount = (orig: number, sale: number) => {
    if (orig <= 0 || sale >= orig) return 0;
    return Math.round(((orig - sale) / orig) * 100);
  };

  // 4. Pure Software Products
  const softwareProducts = [
    {
      title: "Windows 11 Pro Retail Lifetime License Key",
      slug: "windows-11-pro-license-key",
      shortDescription: "Official Microsoft Windows 11 Professional 64-bit permanent activation key with lifetime updates.",
      description: `### Official Genuine Microsoft License
Upgrade your PC to Microsoft Windows 11 Professional with official digital activation.
- **Genuine License:** 100% authentic activation key for 1 PC.
- **Lifetime Validity:** Permanent activation tied to your hardware; no recurring fees.
- **Multi-language:** Supports Arabic, English, French, and all official Microsoft language packs.
- **BitLocker & Sandbox:** Full access to Remote Desktop, Hyper-V, and BitLocker encryption.

#### Activation Instructions
1. Open Windows **Settings** > **System** > **Activation**.
2. Click **Change product key** and enter the 25-character digital license provided in your order.
3. Windows will verify online with Microsoft servers and activate immediately.`,
      originalPrice: 650,
      salePrice: 380,
      discountPercent: calcDiscount(650, 380),
      categoryId: catMap["windows-office"],
      platform: "Windows 11",
      productType: "Lifetime Retail",
      compatibility: "Global",
      deliveryInstructions: "Delivered via SMS/Email and accessible in My Orders upon payment verification.",
      availability: "IN_STOCK",
      stockQuantity: 150,
      isFeatured: true,
      isPublished: true,
      isArchived: false,
      displayOrder: 1,
      images: [
        {
          url: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80",
          altText: "Windows 11 Pro Retail License Key",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Windows 11" },
        { attributeKey: "productType", value: "Lifetime Retail" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
    {
      title: "Microsoft Office 2024 Professional Plus Key",
      slug: "office-2024-pro-plus-key",
      shortDescription: "Complete lifetime suite including Word, Excel, PowerPoint, Outlook, and Access for 1 PC.",
      description: `### The Ultimate Productivity Powerhouse
Microsoft Office 2024 Professional Plus delivers the latest desktop apps for professionals, creators, and businesses.
- Includes Word, Excel, PowerPoint, Outlook, OneNote, and Access.
- Permanent one-time purchase with no monthly subscription required.
- Official direct download link from Microsoft CDN included.

#### Activation Guide
1. Visit setup.office.com or redeem via Microsoft phone/online portal as detailed in fulfillment notes.
2. Enter your 25-digit code and bind or activate on your Windows 10/11 workstation.`,
      originalPrice: 950,
      salePrice: 580,
      discountPercent: calcDiscount(950, 580),
      categoryId: catMap["office-productivity"],
      platform: "Windows 11",
      productType: "Lifetime Retail",
      compatibility: "Global",
      deliveryInstructions: "Delivered via order tracking dashboard with direct official download installer.",
      availability: "IN_STOCK",
      stockQuantity: 90,
      isFeatured: true,
      isPublished: true,
      isArchived: false,
      displayOrder: 2,
      images: [
        {
          url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
          altText: "Microsoft Office 2024 Pro Plus",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Windows 11" },
        { attributeKey: "productType", value: "Lifetime Retail" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
    {
      title: "Windows 10 Pro Retail License Key",
      slug: "windows-10-pro-license-key",
      shortDescription: "Official Microsoft Windows 10 Professional permanent retail license with lifetime updates.",
      description: `### Reliable Operating System for Business & Power Users
Microsoft Windows 10 Professional offers rock-solid stability, enterprise-grade security, and universal hardware support.
- Lifetime activation for 1 PC workstation.
- Supports BitLocker encryption, Remote Desktop, and Client Hyper-V.
- Free eligible upgrade path to Windows 11 included.`,
      originalPrice: 550,
      salePrice: 320,
      discountPercent: calcDiscount(550, 320),
      categoryId: catMap["windows-office"],
      platform: "Windows 10",
      productType: "Lifetime Retail",
      compatibility: "Global",
      deliveryInstructions: "Redeem directly under Windows Settings > Activation > Change Product Key.",
      availability: "IN_STOCK",
      stockQuantity: 120,
      isFeatured: true,
      isPublished: true,
      isArchived: false,
      displayOrder: 3,
      images: [
        {
          url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80",
          altText: "Windows 10 Pro License Key",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Windows 10" },
        { attributeKey: "productType", value: "Lifetime Retail" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
    {
      title: "Kaspersky Premium 2025 (1 Year / 1 Device)",
      slug: "kaspersky-premium-2025-license",
      shortDescription: "Award-winning total antivirus protection, unlimited high-speed VPN, password manager, and identity defense.",
      description: `### Next-Gen Cyber Defense
Protect your identity, sensitive files, and banking credentials against viruses, spyware, and zero-day ransomware.
- 1 Year activation for 1 Windows/Mac PC.
- Free unlimited VPN with high-speed global servers.
- Safe Money browsing protection and webcam blocker.`,
      originalPrice: 450,
      salePrice: 280,
      discountPercent: calcDiscount(450, 280),
      categoryId: catMap["software-security"],
      platform: "Multi-OS",
      productType: "1-Year Subscription",
      compatibility: "Global",
      deliveryInstructions: "Register key on my.kaspersky.com and download installer.",
      availability: "IN_STOCK",
      stockQuantity: 80,
      isFeatured: true,
      isPublished: true,
      isArchived: false,
      displayOrder: 4,
      images: [
        {
          url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
          altText: "Kaspersky Premium 2025 Key",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Multi-OS" },
        { attributeKey: "productType", value: "1-Year Subscription" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
    {
      title: "Microsoft Office 2021 Professional Plus Key",
      slug: "office-2021-pro-plus-key",
      shortDescription: "Classic lifetime Office suite with Word, Excel, PowerPoint, Outlook, and OneNote for 1 PC.",
      description: `### Essential Office Apps for Life
Permanent desktop license of Microsoft Office 2021 Professional Plus with full offline capability.
- No recurring subscription.
- Full commercial use license.`,
      originalPrice: 750,
      salePrice: 450,
      discountPercent: calcDiscount(750, 450),
      categoryId: catMap["office-productivity"],
      platform: "Windows 10",
      productType: "Lifetime Retail",
      compatibility: "Global",
      deliveryInstructions: "Download official installer from Microsoft and enter 25-character key.",
      availability: "IN_STOCK",
      stockQuantity: 70,
      isFeatured: false,
      isPublished: true,
      isArchived: false,
      displayOrder: 5,
      images: [
        {
          url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
          altText: "Microsoft Office 2021 Pro Plus",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Windows 10" },
        { attributeKey: "productType", value: "Lifetime Retail" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
    {
      title: "Adobe Creative Cloud All Apps (1 Year Subscription)",
      slug: "adobe-creative-cloud-all-apps",
      shortDescription: "Complete Adobe suite with Photoshop, Premiere Pro, Illustrator, After Effects, and 100GB Cloud Storage.",
      description: `### The Standard for Creative Professionals
Unleash your creative potential with 20+ world-class apps on desktop, web, and mobile.
- Includes Photoshop, Illustrator, InDesign, Premiere Pro, After Effects, Lightroom.
- Official direct activation to your personal Adobe ID.
- Generative AI credits and 100GB Cloud storage included.`,
      originalPrice: 2800,
      salePrice: 1650,
      discountPercent: calcDiscount(2800, 1650),
      categoryId: catMap["creative-developer"],
      platform: "Multi-OS",
      productType: "1-Year Subscription",
      compatibility: "Global",
      deliveryInstructions: "Redeem directly on redeem.adobe.com or account invitation link.",
      availability: "IN_STOCK",
      stockQuantity: 40,
      isFeatured: false,
      isPublished: true,
      isArchived: false,
      displayOrder: 6,
      images: [
        {
          url: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=800&q=80",
          altText: "Adobe Creative Cloud All Apps",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Multi-OS" },
        { attributeKey: "productType", value: "1-Year Subscription" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
    {
      title: "Windows 10 Home to Pro Upgrade License",
      slug: "windows-10-home-to-pro-upgrade",
      shortDescription: "Instant in-place digital upgrade from Windows 10 Home to Windows 10 Professional.",
      description: `### Upgrade Without Reinstalling
Easily switch your Windows 10 Home installation into Windows 10 Pro without losing personal files or reinstalling applications.
- Unlocks BitLocker device encryption.
- Remote Desktop connection host.
- Windows Sandbox for testing isolated applications.`,
      originalPrice: 500,
      salePrice: 320,
      discountPercent: calcDiscount(500, 320),
      categoryId: catMap["windows-office"],
      platform: "Windows 10",
      productType: "Lifetime Retail",
      compatibility: "Global",
      deliveryInstructions: "Disconnect internet temporarily, enter key in Windows activation settings, reboot.",
      availability: "IN_STOCK",
      stockQuantity: 110,
      isFeatured: false,
      isPublished: true,
      isArchived: false,
      displayOrder: 7,
      images: [
        {
          url: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80",
          altText: "Windows 10 Home to Pro Upgrade",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Windows 10" },
        { attributeKey: "productType", value: "Lifetime Retail" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
    {
      title: "Bitdefender Total Security 2025 (1 Year / 5 Devices)",
      slug: "bitdefender-total-security-2025",
      shortDescription: "Complete cross-platform security for Windows, macOS, Android, and iOS with multi-layer ransomware defense.",
      description: `### Uncompromising Security with Zero Performance Impact
Complete anti-malware and multi-layer ransomware defense across 5 devices.
- Parental control, privacy firewall, and secure online banking.
- Fast, automated real-time background protection.`,
      originalPrice: 650,
      salePrice: 390,
      discountPercent: calcDiscount(650, 390),
      categoryId: catMap["software-security"],
      platform: "Multi-OS",
      productType: "1-Year Subscription",
      compatibility: "Global",
      deliveryInstructions: "Redeem on central.bitdefender.com and link your protected devices.",
      availability: "IN_STOCK",
      stockQuantity: 65,
      isFeatured: false,
      isPublished: true,
      isArchived: false,
      displayOrder: 8,
      images: [
        {
          url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
          altText: "Bitdefender Total Security 2025",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Multi-OS" },
        { attributeKey: "productType", value: "1-Year Subscription" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
  ];

  for (const prod of softwareProducts) {
    const { images, attributes, ...pData } = prod;
    const created = await prisma.product.upsert({
      where: { slug: pData.slug },
      update: pData,
      create: pData,
    });

    await prisma.productImage.deleteMany({ where: { productId: created.id } });
    for (const img of images) {
      await prisma.productImage.create({
        data: {
          productId: created.id,
          url: img.url,
          altText: img.altText,
          isPrimary: img.isPrimary,
          displayOrder: img.displayOrder,
        },
      });
    }

    await prisma.productAttributeValue.deleteMany({ where: { productId: created.id } });
    for (const attr of attributes) {
      await prisma.productAttributeValue.create({
        data: {
          productId: created.id,
          attributeKey: attr.attributeKey,
          value: attr.value,
        },
      });
    }
  }

  // 5. Update Store Settings
  const settingsUpdates: Record<string, string> = {
    hero_heading: "Official Genuine Software & Windows Licenses",
    hero_subheading: "Instant digital activation keys for Windows 11 Pro, Microsoft Office 2024, Kaspersky Security, and premium professional software licenses with verified manual fulfillment.",
    store_description: "PremiKeys is your verified digital marketplace for genuine Windows activation keys, Microsoft Office suites, and software licenses with manual payment verification.",
    footer_text: "Your trusted store for genuine Windows activation keys, Microsoft Office suites, and verified software licenses.",
  };

  for (const [key, value] of Object.entries(settingsUpdates)) {
    await prisma.storeSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  console.log("✅ Successfully updated catalog to 100% Genuine Software & Windows Licenses!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

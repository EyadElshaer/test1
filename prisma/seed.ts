import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting PremiKeys Database Seeding...");

  // 1. Initial Admin Account
  const existingAdmin = await prisma.admin.findFirst();
  let adminPassword = "";
  if (!existingAdmin) {
    // Generate secure random initial password
    adminPassword = "PK-" + crypto.randomBytes(6).toString("hex").toUpperCase() + "!";
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.admin.create({
      data: {
        username: "admin",
        email: "admin@premikeys.com",
        passwordHash,
        role: "SUPER_ADMIN",
        mustChangePassword: true,
      },
    });

    console.log("=================================================");
    console.log("🔑 PREMIKEYS INITIAL ADMIN CREDENTIALS GENERATED:");
    console.log(`   Username: ${admin.username}`);
    console.log(`   Password: ${adminPassword}`);
    console.log("   Notice: Password change is required upon first login.");
    console.log("=================================================");

    // Save temporary credentials notice for initial setup retrieval
    const credPath = path.join(process.cwd(), "INITIAL_ADMIN_SETUP.json");
    fs.writeFileSync(
      credPath,
      JSON.stringify(
        {
          username: admin.username,
          initialPassword: adminPassword,
          mustChangePassword: true,
          generatedAt: new Date().toISOString(),
          note: "This file is generated for initial setup. You must change your password on first login.",
        },
        null,
        2
      )
    );
  } else {
    console.log("ℹ️ Admin account already exists. Skipping admin creation.");
  }

  // 2. Categories
  const categoriesData = [
    {
      name: "PC Games & Activations",
      slug: "pc-games",
      description: "Digital keys and activations for Steam, Epic Games, EA App, and Ubisoft.",
      displayOrder: 1,
      isFeatured: true,
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Windows & Office Licenses",
      slug: "windows-office",
      description: "Genuine OEM & Retail product keys for Windows 11, Windows 10, and Microsoft Office 2024.",
      displayOrder: 2,
      isFeatured: true,
      image: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Subscriptions & Passcards",
      slug: "subscriptions",
      description: "Xbox Game Pass Ultimate, PlayStation Plus, and digital gaming memberships.",
      displayOrder: 3,
      isFeatured: true,
      image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Security & Creative Software",
      slug: "software-security",
      description: "Antivirus, VPNs, developer utilities, and professional creative software licenses.",
      displayOrder: 4,
      isFeatured: false,
      image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const categories: Record<string, any> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
    categories[cat.slug] = created;
  }
  console.log(`✅ Seeded ${Object.keys(categories).length} categories.`);

  // 3. Dynamic Filter Groups & Options (Controlled via Admin)
  const filterGroupsData = [
    {
      label: "Platform",
      attributeKey: "platform",
      filterType: "CHECKBOX",
      displayOrder: 1,
      options: [
        { label: "Steam", value: "Steam", displayOrder: 1 },
        { label: "EA App / Origin", value: "EA App", displayOrder: 2 },
        { label: "Epic Games", value: "Epic Games", displayOrder: 3 },
        { label: "Xbox / Microsoft Store", value: "Xbox", displayOrder: 4 },
        { label: "PlayStation Network", value: "PlayStation", displayOrder: 5 },
        { label: "Windows PC", value: "Windows", displayOrder: 6 },
      ],
    },
    {
      label: "Product Type",
      attributeKey: "productType",
      filterType: "CHECKBOX",
      displayOrder: 2,
      options: [
        { label: "Digital Key", value: "Key", displayOrder: 1 },
        { label: "Account Activation", value: "Activation", displayOrder: 2 },
        { label: "Lifetime License", value: "License", displayOrder: 3 },
        { label: "Subscription Pass", value: "Subscription", displayOrder: 4 },
      ],
    },
    {
      label: "Region & Compatibility",
      attributeKey: "compatibility",
      filterType: "CHECKBOX",
      displayOrder: 3,
      options: [
        { label: "Global / Region Free", value: "Global", displayOrder: 1 },
        { label: "Egypt & Middle East", value: "Egypt/ME", displayOrder: 2 },
        { label: "Europe", value: "Europe", displayOrder: 3 },
        { label: "North America", value: "North America", displayOrder: 4 },
      ],
    },
  ];

  for (const group of filterGroupsData) {
    const createdGroup = await prisma.filterGroup.upsert({
      where: { attributeKey: group.attributeKey },
      update: {
        label: group.label,
        filterType: group.filterType,
        displayOrder: group.displayOrder,
        isActive: true,
      },
      create: {
        label: group.label,
        attributeKey: group.attributeKey,
        filterType: group.filterType,
        displayOrder: group.displayOrder,
        isActive: true,
      },
    });

    // Seed options
    for (const opt of group.options) {
      const existingOpt = await prisma.filterOption.findFirst({
        where: { filterGroupId: createdGroup.id, value: opt.value },
      });
      if (!existingOpt) {
        await prisma.filterOption.create({
          data: {
            filterGroupId: createdGroup.id,
            label: opt.label,
            value: opt.value,
            displayOrder: opt.displayOrder,
          },
        });
      }
    }
  }
  console.log("✅ Seeded dynamic catalog filter groups & options.");

  // Helper to calculate discount percentage: ((original - sale) / original) * 100
  const calcDiscount = (orig: number, sale: number) => {
    if (orig <= 0 || sale >= orig) return 0;
    return Math.round(((orig - sale) / orig) * 100);
  };

  // 4. Products
  const productsData = [
    {
      title: "Windows 11 Pro Retail License Key",
      slug: "windows-11-pro-license-key",
      shortDescription: "Official Microsoft Windows 11 Professional 64-bit permanent activation key with lifetime updates.",
      description: `### Premium Genuine Microsoft License
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
      categoryId: categories["windows-office"].id,
      platform: "Windows",
      productType: "License",
      compatibility: "Global",
      deliveryInstructions: "Delivered via SMS/Email and accessible in My Orders upon payment verification.",
      availability: "IN_STOCK",
      stockQuantity: 150,
      isFeatured: true,
      isPublished: true,
      displayOrder: 1,
      images: [
        {
          url: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80",
          altText: "Windows 11 Pro Activation Key",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Windows" },
        { attributeKey: "productType", value: "License" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
    {
      title: "Microsoft Office 2024 Professional Plus Key",
      slug: "office-2024-pro-plus-key",
      shortDescription: "Complete lifetime suite including Word, Excel, PowerPoint, Outlook, and Access for 1 PC.",
      description: `### The Ultimate Productivity Powerhouse
Microsoft Office 2024 Professional Plus delivers the latest desktop apps for professionals, creators, and students.
- Includes Word, Excel, PowerPoint, Outlook, OneNote, and Access.
- Permanent one-time purchase with no monthly subscription required.
- Official direct download link from Microsoft CDN included.

#### Activation Guide
1. Visit setup.office.com or redeem via Microsoft phone/online portal as detailed in fulfillment notes.
2. Enter your 25-digit code and bind or activate on your Windows 10/11 workstation.`,
      originalPrice: 950,
      salePrice: 580,
      discountPercent: calcDiscount(950, 580),
      categoryId: categories["windows-office"].id,
      platform: "Windows",
      productType: "License",
      compatibility: "Global",
      deliveryInstructions: "Delivered via order tracking dashboard with direct official download installer.",
      availability: "IN_STOCK",
      stockQuantity: 90,
      isFeatured: true,
      isPublished: true,
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
        { attributeKey: "platform", value: "Windows" },
        { attributeKey: "productType", value: "License" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
    {
      title: "Cyberpunk 2077: Ultimate Edition (Steam Key)",
      slug: "cyberpunk-2077-ultimate-edition-steam",
      shortDescription: "Experience Night City and the Phantom Liberty spy-thriller expansion with official Steam activation.",
      description: `### Welcome to Night City
Cyberpunk 2077: Ultimate Edition is the definitive open-world RPG package containing the base game and the celebrated Phantom Liberty expansion.
- **Platform:** Steam (PC).
- **Region:** Global / Region Free.
- Direct digital key activation on your personal Steam account.
- Ray tracing overdrive, DLSS 3.5, and completely revamped skill trees.`,
      originalPrice: 1200,
      salePrice: 790,
      discountPercent: calcDiscount(1200, 790),
      categoryId: categories["pc-games"].id,
      platform: "Steam",
      productType: "Key",
      compatibility: "Global",
      deliveryInstructions: "Redeem directly in Steam client: Games > Activate a Product on Steam.",
      availability: "IN_STOCK",
      stockQuantity: 45,
      isFeatured: true,
      isPublished: true,
      displayOrder: 3,
      images: [
        {
          url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80",
          altText: "Cyberpunk 2077 Ultimate Edition Steam Key",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Steam" },
        { attributeKey: "productType", value: "Key" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
    {
      title: "EA SPORTS FC 25 (EA App PC Key)",
      slug: "ea-sports-fc-25-ea-app-key",
      shortDescription: "The latest chapter of the World's Game with 5v5 Rush, revamped Tactical AI, and Ultimate Team.",
      description: `### Play For The Club
EA SPORTS FC 25 brings you more ways to win for the club. Team up with friends in 5v5 Rush, and manage your team to victory with FC IQ tactical overhaul.
- **Platform:** EA App (formerly Origin).
- **Region:** Global.
- Full access to Career Mode, Ultimate Team, Clubs, and Cross-play.`,
      originalPrice: 1800,
      salePrice: 1199,
      discountPercent: calcDiscount(1800, 1199),
      categoryId: categories["pc-games"].id,
      platform: "EA App",
      productType: "Key",
      compatibility: "Global",
      deliveryInstructions: "Redeem on EA App: Library > Redeem Code.",
      availability: "IN_STOCK",
      stockQuantity: 30,
      isFeatured: true,
      isPublished: true,
      displayOrder: 4,
      images: [
        {
          url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
          altText: "EA SPORTS FC 25 PC Key",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "EA App" },
        { attributeKey: "productType", value: "Key" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
    {
      title: "Xbox Game Pass Ultimate - 3 Months Membership",
      slug: "xbox-game-pass-ultimate-3-months",
      shortDescription: "Access hundreds of high-quality games on PC and Xbox console, including Day-One releases and EA Play.",
      description: `### Unlimited Gaming on PC & Console
Get 3 full months of Xbox Game Pass Ultimate:
- Includes EA Play membership.
- Play hundreds of PC & Xbox games including Starfield, Forza Horizon, Halo, and upcoming Day-One blockbuster releases.
- Online console multiplayer and Cloud Gaming included.`,
      originalPrice: 850,
      salePrice: 590,
      discountPercent: calcDiscount(850, 590),
      categoryId: categories["subscriptions"].id,
      platform: "Xbox",
      productType: "Subscription",
      compatibility: "Global",
      deliveryInstructions: "Redeem on microsoft.com/redeem or the Xbox PC app.",
      availability: "IN_STOCK",
      stockQuantity: 60,
      isFeatured: true,
      isPublished: true,
      displayOrder: 5,
      images: [
        {
          url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
          altText: "Xbox Game Pass Ultimate 3 Months",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Xbox" },
        { attributeKey: "productType", value: "Subscription" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
    {
      title: "Kaspersky Premium 2025 (1 Year / 1 Device)",
      slug: "kaspersky-premium-2025-license",
      shortDescription: "Award-winning total antivirus protection, unlimited VPN, password manager, and identity defense.",
      description: `### Next-Gen Cyber Defense
Protect your identity, sensitive files, and banking credentials against viruses, spyware, and zero-day ransomware.
- 1 Year activation for 1 Windows/Mac PC.
- Free unlimited VPN with high-speed global servers.
- Safe Money browsing protection and webcam blocker.`,
      originalPrice: 450,
      salePrice: 280,
      discountPercent: calcDiscount(450, 280),
      categoryId: categories["software-security"].id,
      platform: "Windows",
      productType: "License",
      compatibility: "Global",
      deliveryInstructions: "Register key on my.kaspersky.com and download installer.",
      availability: "IN_STOCK",
      stockQuantity: 80,
      isFeatured: false,
      isPublished: true,
      displayOrder: 6,
      images: [
        {
          url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
          altText: "Kaspersky Premium 2025 Key",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Windows" },
        { attributeKey: "productType", value: "License" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
    {
      title: "Red Dead Redemption 2 (Rockstar / Epic Games Key)",
      slug: "red-dead-redemption-2-pc-key",
      shortDescription: "Arthur Morgan and the Van der Linde gang's legendary western adventure across the American frontier.",
      description: `### The Masterpiece of Open-World Storytelling
America, 1899. The end of the wild west era has begun. Winner of over 175 Game of the Year Awards and recipient of over 250 perfect scores.
- Stunning PC visual fidelity with HDR, multi-monitor support, and unlocked framerates.
- Includes access to Red Dead Online.`,
      originalPrice: 1100,
      salePrice: 650,
      discountPercent: calcDiscount(1100, 650),
      categoryId: categories["pc-games"].id,
      platform: "Epic Games",
      productType: "Key",
      compatibility: "Global",
      deliveryInstructions: "Redeem code on Epic Games Launcher or Rockstar Social Club.",
      availability: "IN_STOCK",
      stockQuantity: 25,
      isFeatured: false,
      isPublished: true,
      displayOrder: 7,
      images: [
        {
          url: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80",
          altText: "Red Dead Redemption 2 PC",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Epic Games" },
        { attributeKey: "productType", value: "Key" },
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
      categoryId: categories["windows-office"].id,
      platform: "Windows",
      productType: "License",
      compatibility: "Global",
      deliveryInstructions: "Disconnect internet temporarily, enter key in Windows activation settings, reboot.",
      availability: "IN_STOCK",
      stockQuantity: 110,
      isFeatured: false,
      isPublished: true,
      displayOrder: 8,
      images: [
        {
          url: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80",
          altText: "Windows 10 Home to Pro Upgrade",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
      attributes: [
        { attributeKey: "platform", value: "Windows" },
        { attributeKey: "productType", value: "License" },
        { attributeKey: "compatibility", value: "Global" },
      ],
    },
  ];

  for (const prod of productsData) {
    const { images, attributes, ...productData } = prod;
    const createdProduct = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: productData,
      create: productData,
    });

    // Clear old images & attributes before reseeding
    await prisma.productImage.deleteMany({ where: { productId: createdProduct.id } });
    for (const img of images) {
      await prisma.productImage.create({
        data: {
          productId: createdProduct.id,
          url: img.url,
          altText: img.altText,
          isPrimary: img.isPrimary,
          displayOrder: img.displayOrder,
        },
      });
    }

    await prisma.productAttributeValue.deleteMany({ where: { productId: createdProduct.id } });
    for (const attr of attributes) {
      await prisma.productAttributeValue.create({
        data: {
          productId: createdProduct.id,
          attributeKey: attr.attributeKey,
          value: attr.value,
        },
      });
    }
  }
  console.log(`✅ Seeded ${productsData.length} full products with images & attributes.`);

  // 5. Payment Methods (Manual payment configuration)
  const paymentMethodsData = [
    {
      name: "InstaPay Egypt",
      code: "INSTAPAY",
      description: "Instant, fee-free transfer via InstaPay IPA or mobile number.",
      instructions: `1. Open your bank's InstaPay application.
2. Select 'Send Money' to InstaPay IPA or Mobile Number.
3. Transfer the EXACT order total to:
   - **InstaPay Address (IPA):** premikeys@instapay
   - **Recipient Name:** PremiKeys Digital Services
4. Take a clear screenshot of the completed transfer confirmation showing the transaction ID and timestamp.
5. Upload the screenshot below to submit your order for review.`,
      recipientName: "PremiKeys Digital Services",
      accountDetails: "premikeys@instapay",
      currency: "EGP",
      transferReferenceHint: "Enter your Phone Number in transfer notes",
      deepLink: "instapay://",
      publicPaymentUrl: "https://www.instapay.eg",
      requireScreenshot: true,
      displayOrder: 1,
      isActive: true,
    },
    {
      name: "Vodafone Cash & Mobile Wallets",
      code: "VODAFONE_CASH",
      description: "Transfer from any Egyptian mobile wallet (Vodafone, Orange, Etisalat, WE).",
      instructions: `1. Dial *9*7*01000000000*AMOUNT# or use the Ana Vodafone / Wallet App.
2. Transfer the exact order total to wallet number:
   - **Wallet Number:** 0100-000-0000
   - **Wallet Name:** PremiKeys Wallet
3. Save or screenshot the SMS confirmation received from your wallet provider.
4. Upload the screenshot below and enter the wallet sender number.`,
      recipientName: "PremiKeys Wallet",
      accountDetails: "0100-000-0000",
      currency: "EGP",
      transferReferenceHint: "Sender Wallet Number",
      deepLink: "",
      publicPaymentUrl: "",
      requireScreenshot: true,
      displayOrder: 2,
      isActive: true,
    },
    {
      name: "Bank Wire Transfer (CIB / NBE)",
      code: "BANK_TRANSFER",
      description: "Direct bank deposit or mobile banking transfer to our business account.",
      instructions: `1. Initiate a transfer from your bank mobile application or ATM.
2. Bank Details:
   - **Bank Name:** Commercial International Bank (CIB)
   - **Account Name:** PremiKeys for Digital Solutions
   - **Account Number:** 1000-4829-1029
   - **IBAN:** EG3800100001000482910290001
3. Ensure the order number or customer phone number is placed in the payment memo/reference.
4. Upload receipt or transfer voucher screenshot below.`,
      recipientName: "PremiKeys for Digital Solutions",
      accountDetails: "Account: 1000-4829-1029 | IBAN: EG3800100001000482910290001",
      currency: "EGP",
      transferReferenceHint: "Include your Order Number in the wire reference",
      deepLink: "",
      publicPaymentUrl: "",
      requireScreenshot: true,
      displayOrder: 3,
      isActive: true,
    },
    {
      name: "Crypto (USDT / Binance Pay)",
      code: "CRYPTO_USDT",
      description: "Zero-fee Binance Pay ID or USDT TRC20 transfer for international customers.",
      instructions: `1. Open your Binance App or crypto wallet.
2. Transfer via Binance Pay (instant & zero fee):
   - **Binance Pay ID:** 894372810
   - **Currency:** USDT (equivalent converted at 50 EGP/USDT)
3. Or transfer USDT via TRC20 to:
   - **TRC20 Address:** TPremiKeysDigitalAssetsOfficial2026
4. Attach the transaction hash screenshot showing completed status.`,
      recipientName: "PremiKeys Official Pay",
      accountDetails: "Binance Pay ID: 894372810 | USDT (TRC20)",
      currency: "EGP",
      transferReferenceHint: "TxID / Binance Order ID",
      deepLink: "binance://",
      publicPaymentUrl: "https://pay.binance.com",
      requireScreenshot: true,
      displayOrder: 4,
      isActive: true,
    },
  ];

  for (const pm of paymentMethodsData) {
    await prisma.paymentMethod.upsert({
      where: { code: pm.code },
      update: pm,
      create: pm,
    });
  }
  console.log(`✅ Seeded ${paymentMethodsData.length} payment methods.`);

  // 6. Promo Codes
  const promoCodesData = [
    {
      code: "PREMI10",
      description: "Get 10% off on all digital keys and software licenses.",
      discountType: "PERCENTAGE",
      discountValue: 10,
      isActive: true,
      maxUses: 1000,
      maxUsesPerCustomer: 5,
      minSubtotal: 200,
      maxDiscountAmount: 300,
      minProductPrice: null,
    },
    {
      code: "WELCOME50",
      description: "Save 50 EGP on your first order of 300 EGP or more.",
      discountType: "FIXED",
      discountValue: 50,
      isActive: true,
      maxUses: 500,
      maxUsesPerCustomer: 1,
      minSubtotal: 300,
      maxDiscountAmount: 50,
      minProductPrice: null,
    },
    {
      code: "GAMER20",
      description: "20% discount on high-tier games & licenses priced at 500 EGP or above.",
      discountType: "PERCENTAGE",
      discountValue: 20,
      isActive: true,
      maxUses: 250,
      maxUsesPerCustomer: 2,
      minSubtotal: 500,
      maxDiscountAmount: 500,
      minProductPrice: 500, // Meets prompt requirement: "The promo code does not apply to products priced below a specified minimum price"
    },
  ];

  for (const promo of promoCodesData) {
    await prisma.promoCode.upsert({
      where: { code: promo.code },
      update: promo,
      create: promo,
    });
  }
  console.log(`✅ Seeded ${promoCodesData.length} promo codes.`);

  // 7. Frequently Asked Questions (FAQ)
  const faqData = [
    {
      category: "Ordering",
      question: "How do I place an order on PremiKeys?",
      answer: "Browse our catalog, click 'Add to Cart' or 'Buy Now', fill in your name, contact phone number, and email at checkout, select your preferred payment method (such as InstaPay or Vodafone Cash), follow the payment instructions, and upload your payment transfer screenshot.",
      displayOrder: 1,
    },
    {
      category: "Payments",
      question: "How do manual payments work?",
      answer: "We support direct manual payments via InstaPay, Vodafone Cash, Bank Transfer, and Crypto. During checkout, you are provided with our exact payment address/number. Transfer the total amount from your mobile banking or wallet app, take a screenshot of the transaction receipt, and upload it on the checkout page.",
      displayOrder: 2,
    },
    {
      category: "Payments",
      question: "Why do I need to upload a payment screenshot?",
      answer: "Because we process manual bank and wallet transfers, our administration team uses your uploaded payment receipt and transaction reference to swiftly locate and verify your transfer before approving fulfillment.",
      displayOrder: 3,
    },
    {
      category: "Delivery",
      question: "How and when will I receive my digital license or game key?",
      answer: "Once our administration team verifies your manual payment transfer (typically within 10 to 60 minutes during operating hours), your order status changes to Approved/Done. Your activation key and step-by-step activation guide will be instantly accessible on your 'My Orders' tracking page.",
      displayOrder: 4,
    },
    {
      category: "Ordering",
      question: "What do the different order statuses mean?",
      answer: "• Pending: Your order and payment screenshot have been submitted and are queued for verification.\n• Approved: Your payment has been verified by our team.\n• Done: Your digital key/license has been delivered and your order is complete.\n• Rejected: The payment could not be verified (e.g. invalid receipt, incorrect amount). A reason will be noted.",
      displayOrder: 5,
    },
    {
      category: "Refunds",
      question: "Can I request a refund?",
      answer: "Yes. If an unredeemed digital key is defective, or if an order cannot be fulfilled, you can submit a refund request directly through the 'My Orders' page by entering your order number. Our team will review the request and respond in accordance with our Refund Policy.",
      displayOrder: 6,
    },
    {
      category: "General",
      question: "How can I contact PremiKeys support?",
      answer: "You can reach out to our dedicated support team via email at support@premikeys.com or via WhatsApp at our official contact number provided in the website footer.",
      displayOrder: 7,
    },
  ];

  await prisma.faqItem.deleteMany({});
  for (const faq of faqData) {
    await prisma.faqItem.create({
      data: {
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        displayOrder: faq.displayOrder,
        isPublished: true,
      },
    });
  }
  console.log(`✅ Seeded ${faqData.length} FAQ questions.`);

  // 8. Store Settings
  const defaultSettings = [
    { key: "store_name", value: "PremiKeys" },
    { key: "site_url", value: "https://premikeys.com" },
    { key: "currency", value: "EGP" },
    { key: "currency_symbol", value: "EGP" },
    { key: "contact_email", value: "support@premikeys.com" },
    { key: "contact_phone", value: "+20 100 000 0000" },
    { key: "contact_whatsapp", value: "+20 100 000 0000" },
    { key: "announcement_banner", value: "⚡ FLASH SALE: Use code PREMI10 for 10% off your digital game & software keys!" },
    { key: "hero_heading", value: "Unleash Pure Gaming & Pro Software" },
    { key: "hero_subheading", value: "Instant digital activation keys for top-tier PC games, Windows 11 Pro, Microsoft Office, and premium software licenses at unbeatable rates." },
    { key: "footer_text", value: "PremiKeys is your trusted destination for genuine digital software licenses, PC activations, and premium gaming keys." },
    { key: "status_desc_pending", value: "Your order and payment transfer evidence have been received and are waiting for review by our fulfillment team." },
    { key: "status_desc_approved", value: "Your payment has been successfully verified! Order fulfillment is in progress." },
    { key: "status_desc_done", value: "Your order is complete! Your digital license key and activation guide are ready." },
    { key: "status_desc_rejected", value: "Payment verification was unsuccessful. Please check the administrator note below or contact support." },
  ];

  for (const s of defaultSettings) {
    await prisma.storeSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log(`✅ Seeded ${defaultSettings.length} store settings.`);

  console.log("🎉 PremiKeys Database Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

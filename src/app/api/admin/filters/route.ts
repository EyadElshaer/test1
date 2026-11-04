import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, hasAdminPermission, logAdminAudit } from "@/lib/auth";
import { sanitizeString } from "@/lib/sanitizer";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;
    if (
      !hasAdminPermission(auth.admin, "filters") &&
      !hasAdminPermission(auth.admin, "products")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filterGroups = await prisma.filterGroup.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        category: { select: { id: true, name: true } },
        options: { orderBy: { displayOrder: "asc" } },
      },
    });

    return NextResponse.json({ success: true, filterGroups });
  } catch (error) {
    console.error("Failed to load filters:", error);
    return NextResponse.json({ error: "Failed to load filters." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin("filters");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { label, attributeKey, filterType, displayOrder, isActive, categoryId, options } =
      await req.json();

    const cleanLabel = typeof label === "string" ? sanitizeString(label, 100) : "";
    if (!cleanLabel || !attributeKey) {
      return NextResponse.json({ error: "Label and attributeKey are required." }, { status: 400 });
    }

    const cleanKey = String(attributeKey).trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

    const existing = await prisma.filterGroup.findUnique({
      where: { attributeKey: cleanKey },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A filter group with key '${cleanKey}' already exists.` },
        { status: 400 }
      );
    }

    const group = await prisma.$transaction(async (tx: any) => {
      const created = await tx.filterGroup.create({
        data: {
          label: cleanLabel,
          attributeKey: cleanKey,
          filterType: filterType || "CHECKBOX",
          displayOrder: parseInt(displayOrder) || 0,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          categoryId: categoryId || null,
        },
      });

      if (Array.isArray(options) && options.length > 0) {
        for (let idx = 0; idx < options.length; idx++) {
          const opt = options[idx];
          if (opt.label && opt.value) {
            await tx.filterOption.create({
              data: {
                filterGroupId: created.id,
                label: sanitizeString(opt.label, 100),
                value: sanitizeString(opt.value, 100),
                displayOrder: idx,
              },
            });
          }
        }
      }

      return created;
    });

    await logAdminAudit(admin.id, "FILTER_CREATED", `Filter group created: ${group.label} (${cleanKey})`);

    return NextResponse.json({ success: true, filterGroup: group });
  } catch (error) {
    console.error("Failed to create filter:", error);
    return NextResponse.json({ error: "Failed to create filter." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { label, attributeKey, filterType, displayOrder, isActive, categoryId, options } =
      await req.json();

    if (!label || !attributeKey) {
      return NextResponse.json({ error: "Label and attributeKey are required." }, { status: 400 });
    }

    const cleanKey = attributeKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

    const existing = await prisma.filterGroup.findUnique({
      where: { attributeKey: cleanKey },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A filter group with key '${cleanKey}' already exists.` },
        { status: 400 }
      );
    }

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.filterGroup.create({
        data: {
          label: label.trim(),
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
                label: opt.label.trim(),
                value: opt.value.trim(),
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

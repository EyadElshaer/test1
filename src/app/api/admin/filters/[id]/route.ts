import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, logAdminAudit } from "@/lib/auth";
import { isValidId, sanitizeString } from "@/lib/sanitizer";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin("filters");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid filter ID." }, { status: 400 });
    }
    const { label, filterType, displayOrder, isActive, categoryId, options } = await req.json();

    const updated = await prisma.$transaction(async (tx: any) => {
      const group = await tx.filterGroup.update({
        where: { id },
        data: {
          label: sanitizeString(label, 100),
          filterType: filterType || "CHECKBOX",
          displayOrder: parseInt(displayOrder) || 0,
          isActive: Boolean(isActive),
          categoryId: categoryId || null,
        },
      });

      if (Array.isArray(options)) {
        await tx.filterOption.deleteMany({ where: { filterGroupId: id } });
        for (let idx = 0; idx < options.length; idx++) {
          const opt = options[idx];
          if (opt.label && opt.value) {
            await tx.filterOption.create({
              data: {
                filterGroupId: id,
                label: sanitizeString(opt.label, 100),
                value: sanitizeString(opt.value, 100),
                displayOrder: idx,
              },
            });
          }
        }
      }

      return group;
    });

    await logAdminAudit(admin.id, "FILTER_UPDATED", `Filter group updated: ${updated.label}`);

    return NextResponse.json({ success: true, filterGroup: updated });
  } catch (error) {
    console.error("Failed to update filter:", error);
    return NextResponse.json({ error: "Failed to update filter." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin("filters");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid filter ID." }, { status: 400 });
    }
    await prisma.filterGroup.delete({ where: { id } });
    await logAdminAudit(admin.id, "FILTER_DELETED", `Filter group deleted: ${id}`);

    return NextResponse.json({ success: true, message: "Filter deleted successfully." });
  } catch (error) {
    console.error("Failed to delete filter:", error);
    return NextResponse.json({ error: "Failed to delete filter." }, { status: 500 });
  }
}

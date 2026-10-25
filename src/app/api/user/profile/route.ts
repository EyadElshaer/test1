import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession, isEmail, normalizePhone } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  try {
    const sessionUser = await getUserSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, phone } = await req.json();

    const updateData: { name?: string; email?: string | null; phone?: string | null } = {};

    if (name !== undefined) {
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return NextResponse.json({ error: "Name must be at least 2 characters long." }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      if (email === "" || email === null) {
        // Can only clear email if user has a phone
        const targetPhone = phone !== undefined ? phone : sessionUser.phone;
        if (!targetPhone) {
          return NextResponse.json({ error: "Cannot remove email because no phone number is linked." }, { status: 400 });
        }
        updateData.email = null;
      } else {
        const cleanEmail = email.trim().toLowerCase();
        if (!isEmail(cleanEmail)) {
          return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
        }

        // Check uniqueness
        const existing = await prisma.user.findFirst({
          where: {
            email: cleanEmail,
            NOT: { id: sessionUser.id },
          },
        });

        if (existing) {
          return NextResponse.json({ error: "This email address is already registered to another account." }, { status: 409 });
        }

        updateData.email = cleanEmail;
      }
    }

    if (phone !== undefined) {
      if (phone === "" || phone === null) {
        // Can only clear phone if user has an email
        const targetEmail = updateData.email !== undefined ? updateData.email : sessionUser.email;
        if (!targetEmail) {
          return NextResponse.json({ error: "Cannot remove phone number because no email address is linked." }, { status: 400 });
        }
        updateData.phone = null;
      } else {
        const cleanPhone = normalizePhone(phone);
        if (!cleanPhone || cleanPhone.replace(/[^\d]/g, "").length < 8) {
          return NextResponse.json({ error: "Please enter a valid mobile phone number." }, { status: 400 });
        }

        // Check uniqueness
        const existing = await prisma.user.findFirst({
          where: {
            phone: cleanPhone,
            NOT: { id: sessionUser.id },
          },
        });

        if (existing) {
          return NextResponse.json({ error: "This phone number is already registered to another account." }, { status: 409 });
        }

        updateData.phone = cleanPhone;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        authProvider: true,
        googleId: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    // Backlink past guest orders with updated email or phone
    const orderLinkFilters: any[] = [];
    if (updateData.email) {
      orderLinkFilters.push({ customerEmail: updateData.email });
    }
    if (updateData.phone) {
      orderLinkFilters.push({ customerPhone: updateData.phone });
    }
    if (orderLinkFilters.length > 0) {
      await prisma.order.updateMany({
        where: {
          userId: null,
          OR: orderLinkFilters,
        },
        data: {
          userId: updatedUser.id,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        authProvider: updatedUser.authProvider,
        googleId: updatedUser.googleId,
        hasGoogle: Boolean(updatedUser.googleId),
        hasPassword: Boolean(updatedUser.passwordHash),
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}

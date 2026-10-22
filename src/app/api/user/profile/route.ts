import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession, isEmail } from "@/lib/userAuth";

export async function PATCH(req: Request) {
  try {
    const sessionUser = await getUserSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email } = await req.json();

    const updateData: { name?: string; email?: string | null } = {};

    if (name !== undefined) {
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return NextResponse.json({ error: "Name must be at least 2 characters long." }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      if (email === "" || email === null) {
        // Can only clear email if user has a phone
        if (!sessionUser.phone) {
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

    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    // If email was added/updated, optionally connect unlinked orders
    if (updateData.email) {
      await prisma.order.updateMany({
        where: {
          customerEmail: updateData.email,
          userId: null,
        },
        data: {
          userId: updatedUser.id,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}

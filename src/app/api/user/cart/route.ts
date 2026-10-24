import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/userAuth";

export async function GET() {
  try {
    const sessionUser = await getUserSession();
    if (!sessionUser) {
      return NextResponse.json({ authenticated: false, cart: [] });
    }

    const user = await (prisma.user as any).findUnique({
      where: { id: sessionUser.id },
      select: {
        cartData: true,
        cartUpdatedAt: true,
      },
    });

    let cartItems: any[] = [];
    if (user?.cartData) {
      try {
        cartItems = JSON.parse(user.cartData);
        if (!Array.isArray(cartItems)) cartItems = [];
      } catch (e) {
        cartItems = [];
      }
    }

    return NextResponse.json({
      authenticated: true,
      cart: cartItems,
      cartUpdatedAt: user?.cartUpdatedAt || null,
    });
  } catch (error) {
    console.error("Error fetching user cart:", error);
    return NextResponse.json({ error: "Failed to fetch cart." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getUserSession();
    if (!sessionUser) {
      return NextResponse.json({ authenticated: false, error: "Not logged in" }, { status: 401 });
    }

    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];

    const cartString = items.length > 0 ? JSON.stringify(items) : null;

    await (prisma.user as any).update({
      where: { id: sessionUser.id },
      data: {
        cartData: cartString,
        cartUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      count: items.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving user cart:", error);
    return NextResponse.json({ error: "Failed to save cart." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const sessionUser = await getUserSession();
    if (!sessionUser) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    await (prisma.user as any).update({
      where: { id: sessionUser.id },
      data: {
        cartData: null,
        cartUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "Cart cleared." });
  } catch (error) {
    console.error("Error clearing user cart:", error);
    return NextResponse.json({ error: "Failed to clear cart." }, { status: 500 });
  }
}

import crypto from "crypto";
import prisma from "@/lib/prisma";

export async function generateUniqueOrderNumber(): Promise<string> {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Remove ambiguous 0/O, 1/I
  let orderNumber = "";
  let isUnique = false;

  while (!isUnique) {
    let randomPart = "";
    const bytes = crypto.randomBytes(7);
    for (let i = 0; i < 7; i++) {
      randomPart += chars[bytes[i] % chars.length];
    }
    orderNumber = `#DN${randomPart}`;

    const existing = await prisma.order.findUnique({
      where: { orderNumber },
    });
    if (!existing) {
      isUnique = true;
    }
  }

  return orderNumber;
}

export async function generateUniqueRefundNumber(): Promise<string> {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let refundNumber = "";
  let isUnique = false;

  while (!isUnique) {
    let randomPart = "";
    const bytes = crypto.randomBytes(7);
    for (let i = 0; i < 7; i++) {
      randomPart += chars[bytes[i] % chars.length];
    }
    refundNumber = `#RF${randomPart}`;

    const existing = await prisma.refundRequest.findUnique({
      where: { refundNumber },
    });
    if (!existing) {
      isUnique = true;
    }
  }

  return refundNumber;
}

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Copy,
  ExternalLink,
} from "lucide-react";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const decodedNumber = decodeURIComponent(orderNumber).trim().toUpperCase();

  const order = await prisma.order.findUnique({
    where: { orderNumber: decodedNumber },
    include: {
      items: true,
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      {/* Success Badge & Headline */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)]">
          <CheckCircle className="w-10 h-10 animate-bounce" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-cyan-400 border border-blue-500/30">
          Order Received Successfully
        </span>

        <h1 className="text-3xl sm:text-5xl font-black text-white font-mono">
          Thank You for Choosing PremiKeys!
        </h1>

        <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Your order has been received successfully. Our team will review your payment and update your order status as soon as possible.
        </p>
      </div>

      {/* Main Order Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-10 border border-white/10 space-y-8">
        {/* Top Info Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-white/10">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Your Order Number</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xl font-black text-cyan-300 select-all">
                {order.orderNumber}
              </span>
            </div>
            <span className="text-[11px] text-slate-500">Save this number to track your order</span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block font-medium">Order Date</span>
            <span className="font-semibold text-white text-sm block mt-1">
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="text-[11px] text-slate-500">Submitted Online</span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block font-medium">Payment Review Status</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold status-badge-pending mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Manual Review</span>
            </span>
          </div>
        </div>

        {/* Warning / Verification Clarification Notice */}
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-300 space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Payment Verification in Progress</span>
          </div>
          <p>
            Because we use direct manual transfer methods ({order.paymentMethodName}), our administration team verifies your uploaded payment receipt against incoming bank/wallet records before releasing your digital license key.
          </p>
        </div>

        {/* Order Items Table */}
        <div className="space-y-4">
          <h3 className="font-bold text-white text-base">Purchased Digital Items</h3>
          <div className="divide-y divide-white/5 border-t border-b border-white/10">
            {(order.items as any[]).map((item: any) => (
              <div key={item.id} className="py-4 flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                    <Image
                      src={item.productImage || "/images/premikeys-logo.png"}
                      alt={item.productTitle}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-white block">{item.productTitle}</span>
                    <span className="text-xs text-slate-400">Qty: {item.quantity}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-white">
                    {item.lineTotal.toLocaleString()} {order.currency}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="space-y-2 text-xs text-slate-300 pt-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-white font-medium">{order.subtotal.toLocaleString()} {order.currency}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Promo Discount ({order.promoCodeCode})</span>
                <span>-{order.discountAmount.toLocaleString()} {order.currency}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/10">
              <span>Total Amount</span>
              <span className="text-cyan-300 font-mono text-xl">{order.totalAmount.toLocaleString()} {order.currency}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
          <Link
            href={`/my-orders?orderNumber=${encodeURIComponent(order.orderNumber)}`}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white btn-primary flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
          >
            <span>Track Order & View License</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/products"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-300 btn-secondary flex items-center justify-center gap-2"
          >
            <span>Return to Store</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

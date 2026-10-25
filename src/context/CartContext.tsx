"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  productId: string;
  title: string;
  slug: string;
  image: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  platform?: string;
  productType?: string;
  quantity: number;
  configurationId?: string;
  configurationName?: string;
}

export interface AppliedPromo {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  description?: string;
  discountAmount: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  promoDiscount: number;
  total: number;
  appliedPromo: AppliedPromo | null;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string, configurationId?: string) => void;
  updateQuantity: (productId: string, quantity: number, configurationId?: string) => void;
  clearCart: () => void;
  applyPromo: (code: string) => Promise<{ success: boolean; message: string; discount?: number }>;
  removePromo: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "premikeys_cart_v1";
const PROMO_STORAGE_KEY = "premikeys_promo_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount and sync with database cart if signed in
  useEffect(() => {
    let localItems: CartItem[] = [];
    try {
      const savedItems = localStorage.getItem(CART_STORAGE_KEY);
      if (savedItems) {
        localItems = JSON.parse(savedItems);
        setItems(localItems);
      }
      const savedPromo = localStorage.getItem(PROMO_STORAGE_KEY);
      if (savedPromo) {
        setAppliedPromo(JSON.parse(savedPromo));
      }
    } catch (e) {
      console.error("Failed to load cart from storage", e);
    } finally {
      setIsLoaded(true);
    }

    // Check if user is logged in and sync database cart
    fetch("/api/user/cart")
      .then((res) => res.json())
      .then((data) => {
        if (data?.authenticated) {
          if (localItems.length === 0 && Array.isArray(data.cart) && data.cart.length > 0) {
            setItems(data.cart);
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data.cart));
          } else if (localItems.length > 0) {
            // Push client items to server so admin sees the active cart
            fetch("/api/user/cart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: localItems }),
            }).catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, []);

  // Save to localStorage on change and sync to server
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save cart to storage", e);
    }

    // Debounce save to database cart for customer account
    const timer = setTimeout(() => {
      fetch("/api/user/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }).catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
  }, [items, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (appliedPromo) {
        localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(appliedPromo));
      } else {
        localStorage.removeItem(PROMO_STORAGE_KEY);
      }
    } catch (e) {
      console.error("Failed to save promo to storage", e);
    }
  }, [appliedPromo, isLoaded]);

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.salePrice * item.quantity, 0);

  // Recalculate promo discount on the client for instant UI feedback (fully validated on server too!)
  let promoDiscount = 0;
  if (appliedPromo && items.length > 0) {
    if (appliedPromo.discountType === "PERCENTAGE") {
      promoDiscount = Math.round((subtotal * appliedPromo.discountValue) / 100);
    } else {
      promoDiscount = Math.min(appliedPromo.discountValue, subtotal);
    }
  }
  const total = Math.max(0, subtotal - promoDiscount);

  const addItem = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const configKey = item.configurationId || "";
      const existing = prev.find(
        (i) => i.productId === item.productId && (i.configurationId || "") === configKey
      );
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId && (i.configurationId || "") === configKey
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeItem = (productId: string, configurationId?: string) => {
    setItems((prev) =>
      prev.filter((i) => {
        if (i.productId !== productId) return true;
        if (configurationId !== undefined && (i.configurationId || "") !== (configurationId || "")) return true;
        return false;
      })
    );
  };

  const updateQuantity = (productId: string, quantity: number, configurationId?: string) => {
    if (quantity <= 0) {
      removeItem(productId, configurationId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        const matches =
          i.productId === productId &&
          (configurationId === undefined || (i.configurationId || "") === (configurationId || ""));
        return matches ? { ...i, quantity } : i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedPromo(null);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(PROMO_STORAGE_KEY);
    } catch (e) {
      // ignore
    }
    fetch("/api/user/cart", { method: "DELETE" }).catch(() => {});
  };

  const applyPromo = async (code: string) => {
    if (!code.trim()) {
      return { success: false, message: "Please enter a promo code." };
    }
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          subtotal,
          items: items.map((i) => ({ productId: i.productId, price: i.salePrice, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        return { success: false, message: data.message || "Invalid or expired promo code." };
      }

      setAppliedPromo({
        code: data.promo.code,
        discountType: data.promo.discountType,
        discountValue: data.promo.discountValue,
        description: data.promo.description,
        discountAmount: data.discountAmount,
      });

      return {
        success: true,
        message: `Promo code '${data.promo.code}' applied successfully!`,
        discount: data.discountAmount,
      };
    } catch (err) {
      return { success: false, message: "Network error validating promo code." };
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        promoDiscount,
        total,
        appliedPromo,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        applyPromo,
        removePromo,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

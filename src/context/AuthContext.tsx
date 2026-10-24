"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CustomerUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt?: string;
}

export interface AuthLoginResponse {
  success: boolean;
  error?: string;
  isLocked?: boolean;
  requiresCaptcha?: boolean;
  remainingAttempts?: number;
  retryAfterSeconds?: number;
  recaptchaFailed?: boolean;
}

interface AuthContextType {
  user: CustomerUser | null;
  loading: boolean;
  login: (
    identifier: string,
    password: string,
    recaptchaToken?: string
  ) => Promise<AuthLoginResponse>;
  register: (data: {
    name: string;
    identifier?: string;
    email?: string;
    phone?: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to check auth state:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const syncLocalCartToServer = () => {
    try {
      const localCart = localStorage.getItem("premikeys_cart_v1");
      if (localCart) {
        const parsed = JSON.parse(localCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          fetch("/api/user/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: parsed }),
          }).catch(() => {});
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const login = async (
    identifier: string,
    password: string,
    recaptchaToken?: string
  ): Promise<AuthLoginResponse> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          recaptchaToken,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Login failed",
          isLocked: data.isLocked,
          requiresCaptcha: data.requiresCaptcha || data.recaptchaRequired,
          remainingAttempts: data.remainingAttempts,
          retryAfterSeconds: data.retryAfterSeconds,
          recaptchaFailed: data.recaptchaFailed,
        };
      }

      setUser(data.user);
      syncLocalCartToServer();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network error. Please try again." };
    }
  };

  const register = async (formData: {
    name: string;
    identifier?: string;
    email?: string;
    phone?: string;
    password: string;
  }) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Registration failed" };
      }
      setUser(data.user);
      syncLocalCartToServer();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network error. Please try again." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to log out:", err);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

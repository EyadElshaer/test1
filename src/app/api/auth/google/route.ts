import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import {
  isGoogleAuthConfigured,
  buildGoogleOAuthUrl,
  verifyGoogleCredential,
  syncGoogleUser,
} from "@/lib/googleAuth";
import { createUserSession, getUserSession } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

/**
 * GET: Starts the Google OAuth 2.0 redirect flow (Login or Link Account)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const redirectTarget = searchParams.get("redirect") || "/account/orders";
    const action = searchParams.get("action"); // "link" or standard login

    // 1. Check if Google OAuth credentials are set in environment
    if (!isGoogleAuthConfigured()) {
      const errorUrl = new URL(action === "link" ? "/account" : "/login", req.url);
      errorUrl.searchParams.set("error", "google_not_configured");
      if (redirectTarget) errorUrl.searchParams.set("redirect", redirectTarget);
      return NextResponse.redirect(errorUrl);
    }

    // Check if user is currently logged in (for account linking)
    const currentUser = await getUserSession();

    // 2. Generate cryptographically random state to protect against CSRF
    const randomState = crypto.randomBytes(24).toString("hex");
    const statePayload = Buffer.from(
      JSON.stringify({
        token: randomState,
        redirect: redirectTarget,
        action: action === "link" ? "link" : "login",
        userId: action === "link" && currentUser ? currentUser.id : undefined,
      })
    ).toString("base64url");

    // 3. Store the state token in an HTTP-only secure cookie for verification
    const cookieStore = await cookies();
    cookieStore.set("premikeys_google_state", randomState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10, // 10 minutes expiry
    });

    // 4. Redirect the user to Google's consent dialog
    const googleUrl = buildGoogleOAuthUrl(statePayload, req);
    return NextResponse.redirect(googleUrl);
  } catch (error: any) {
    console.error("Google OAuth initiate error:", error);
    const fallbackUrl = new URL("/login?error=google_failed", req.url);
    return NextResponse.redirect(fallbackUrl);
  }
}

/**
 * POST: Handles Google ID token / GIS One-Tap credentials
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { credential } = body;

    if (!credential || typeof credential !== "string") {
      return NextResponse.json(
        { error: "Google credential token is missing." },
        { status: 400 }
      );
    }

    // 1. Verify credential token with Google
    const profile = await verifyGoogleCredential(credential);

    // 2. Create or sync user in database
    const user = await syncGoogleUser(profile);

    // 3. Issue persistent session cookie
    await createUserSession(user.id, req.headers);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        authProvider: user.authProvider,
        googleId: user.googleId,
        hasGoogle: Boolean(user.googleId),
        hasPassword: Boolean(user.passwordHash),
        createdAt: user.createdAt,
      },
      message: "Logged in with Google successfully!",
    });
  } catch (error: any) {
    console.error("Google verify token error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to authenticate with Google." },
      { status: 400 }
    );
  }
}

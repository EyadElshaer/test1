import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  syncGoogleUser,
} from "@/lib/googleAuth";
import { createUserSession } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

/**
 * GET: Handles the callback from Google OAuth 2.0 authorization server
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieStore = await cookies();

  let destination = "/account/orders";

  // Decode redirect target from state if present
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      if (decoded.redirect && typeof decoded.redirect === "string" && decoded.redirect.startsWith("/")) {
        destination = decoded.redirect;
      }
    } catch {
      // ignore state parse errors
    }
  }

  // 1. Handle user cancellation or Google authorization error
  if (error) {
    console.warn("Google OAuth callback error returned by Google:", error);
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "error",
      error === "access_denied" ? "google_cancelled" : "google_auth_failed"
    );
    if (destination) loginUrl.searchParams.set("redirect", destination);
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(loginUrl);
  }

  // 2. Anti-CSRF state token verification
  const storedStateToken = cookieStore.get("premikeys_google_state")?.value;
  cookieStore.delete("premikeys_google_state");

  let stateIsValid = false;
  if (state && storedStateToken) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      if (decoded.token === storedStateToken) {
        stateIsValid = true;
      }
    } catch {
      stateIsValid = false;
    }
  }

  if (!stateIsValid) {
    console.warn("Google OAuth state token mismatch (possible CSRF or expired session)");
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 3. Exchange authorization code for tokens
    const tokens = await exchangeGoogleCode(code, req);

    // 4. Retrieve verified user profile from Google
    const profile = await fetchGoogleUserInfo(tokens.access_token);

    // 5. Create or update user account in Prisma PostgreSQL database
    const user = await syncGoogleUser(profile);

    // 6. Create persistent user session cookie
    await createUserSession(user.id, req.headers);

    // 7. Redirect to requested destination or account dashboard
    const targetUrl = new URL(destination, req.url);
    return NextResponse.redirect(targetUrl);
  } catch (exchangeError: any) {
    console.error("Error processing Google OAuth tokens:", exchangeError);
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "error",
      encodeURIComponent(exchangeError?.message || "google_exchange_failed")
    );
    if (destination) loginUrl.searchParams.set("redirect", destination);
    return NextResponse.redirect(loginUrl);
  }
}

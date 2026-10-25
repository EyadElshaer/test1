import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  fetchGoogleUserPhoneNumber,
  syncGoogleUser,
} from "@/lib/googleAuth";
import { createUserSession, normalizePhone } from "@/lib/userAuth";

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
  let decodedState: any = null;

  // Decode redirect target & action from state if present
  if (state) {
    try {
      decodedState = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      if (
        decodedState.redirect &&
        typeof decodedState.redirect === "string" &&
        decodedState.redirect.startsWith("/")
      ) {
        destination = decodedState.redirect;
      }
    } catch {
      // ignore state parse errors
    }
  }

  const isLinkAction = decodedState?.action === "link";
  const fallbackUrlPath = isLinkAction ? "/account" : "/login";

  // 1. Handle user cancellation or Google authorization error
  if (error) {
    console.warn("Google OAuth callback error returned by Google:", error);
    const redirectUrl = new URL(fallbackUrlPath, req.url);
    redirectUrl.searchParams.set(
      "error",
      error === "access_denied" ? "google_cancelled" : "google_auth_failed"
    );
    if (!isLinkAction && destination) redirectUrl.searchParams.set("redirect", destination);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = new URL(fallbackUrlPath, req.url);
    redirectUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Anti-CSRF state token verification
  const storedStateToken = cookieStore.get("premikeys_google_state")?.value;
  cookieStore.delete("premikeys_google_state");

  let stateIsValid = false;
  if (decodedState && storedStateToken && decodedState.token === storedStateToken) {
    stateIsValid = true;
  }

  if (!stateIsValid) {
    console.warn("Google OAuth state token mismatch (possible CSRF or expired session)");
    const redirectUrl = new URL(fallbackUrlPath, req.url);
    redirectUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // 3. Exchange authorization code for tokens
    const tokens = await exchangeGoogleCode(code, req);

    // 4. Retrieve verified user profile from Google
    const profile = await fetchGoogleUserInfo(tokens.access_token);
    const phoneNumber = await fetchGoogleUserPhoneNumber(tokens.access_token).catch(() => null);

    // 5. Check if this is an ACCOUNT LINKING action initiated from customer profile
    if (isLinkAction && decodedState?.userId) {
      const linkingUserId = decodedState.userId;

      // Ensure this Google account is not already linked to ANOTHER customer
      const existingGoogleUser = await prisma.user.findFirst({
        where: {
          googleId: profile.sub,
          NOT: { id: linkingUserId },
        },
      });

      if (existingGoogleUser) {
        const targetUrl = new URL("/account", req.url);
        targetUrl.searchParams.set("error", "google_already_linked");
        return NextResponse.redirect(targetUrl);
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: linkingUserId },
      });

      if (!currentUser) {
        const targetUrl = new URL("/login?error=account_not_found", req.url);
        return NextResponse.redirect(targetUrl);
      }

      const updates: any = {
        googleId: profile.sub,
      };

      if (!currentUser.avatar && profile.picture) {
        updates.avatar = profile.picture;
      }

      // If user had no email, attach Google email if not already taken
      if (!currentUser.email && profile.email) {
        const cleanEmail = profile.email.trim().toLowerCase();
        const emailTaken = await prisma.user.findFirst({
          where: { email: cleanEmail, NOT: { id: linkingUserId } },
        });
        if (!emailTaken) {
          updates.email = cleanEmail;
        }
      }

      // If user had no phone, attach Google phone if retrieved and not taken
      if (!currentUser.phone && phoneNumber) {
        const cleanPhone = normalizePhone(phoneNumber);
        if (cleanPhone) {
          const phoneTaken = await prisma.user.findFirst({
            where: { phone: cleanPhone, NOT: { id: linkingUserId } },
          });
          if (!phoneTaken) {
            updates.phone = cleanPhone;
          }
        }
      }

      await prisma.user.update({
        where: { id: linkingUserId },
        data: updates,
      });

      // Backlink orders
      try {
        const orderFilters: any[] = [];
        if (currentUser.email || updates.email) {
          orderFilters.push({ customerEmail: (updates.email || currentUser.email)!.toLowerCase() });
        }
        if (currentUser.phone || updates.phone) {
          orderFilters.push({ customerPhone: updates.phone || currentUser.phone });
        }
        if (orderFilters.length > 0) {
          await prisma.order.updateMany({
            where: {
              userId: null,
              OR: orderFilters,
            },
            data: { userId: linkingUserId },
          });
        }
      } catch (err) {
        console.warn("Backlink orders error during link:", err);
      }

      const targetUrl = new URL(destination || "/account", req.url);
      targetUrl.searchParams.set("success", "google_linked");
      return NextResponse.redirect(targetUrl);
    }

    // 6. Normal sign-in or registration with Google
    const user = await syncGoogleUser(profile, phoneNumber);

    // 7. Create persistent user session cookie
    await createUserSession(user.id, req.headers);

    // 8. Redirect to requested destination or account dashboard
    const targetUrl = new URL(destination, req.url);
    return NextResponse.redirect(targetUrl);
  } catch (exchangeError: any) {
    console.error("Error processing Google OAuth tokens:", exchangeError);
    const redirectUrl = new URL(fallbackUrlPath, req.url);
    redirectUrl.searchParams.set(
      "error",
      encodeURIComponent(exchangeError?.message || "google_exchange_failed")
    );
    if (!isLinkAction && destination) redirectUrl.searchParams.set("redirect", destination);
    return NextResponse.redirect(redirectUrl);
  }
}

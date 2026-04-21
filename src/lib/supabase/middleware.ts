import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const ONBOARDING_COOKIE = "hc_onboarded";
  const ONBOARDING_COOKIE_MAX_AGE = 60;

  const redirectTo = (targetPath: string) => {
    const url = request.nextUrl.clone();
    url.pathname = targetPath;
    return NextResponse.redirect(url);
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.startsWith("your_") ||
    supabaseKey.startsWith("your_")
  ) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAuthPage =
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password");
    const isGuestOnlyAuthPage =
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/forgot-password");
    const isResetPasswordPage = pathname.startsWith("/reset-password");
    const isOnboardingPage = pathname.startsWith("/onboarding");
    const isAuthCallback = pathname.startsWith("/auth");

    if (!user && !isAuthPage && !isAuthCallback) {
      return redirectTo("/login");
    }

    if (user && isGuestOnlyAuthPage) {
      return redirectTo("/");
    }

    if (user && !isAuthCallback && !isResetPasswordPage) {
      const cachedOnboarded = request.cookies.get(ONBOARDING_COOKIE)?.value;
      let onboarded: boolean | undefined;

      if (cachedOnboarded === "1") {
        onboarded = true;
      } else if (cachedOnboarded === "0") {
        onboarded = false;
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("id", user.id)
          .single();

        onboarded = (profile as { onboarding_complete: boolean } | null)?.onboarding_complete;
        if (onboarded === true || onboarded === false) {
          supabaseResponse.cookies.set(ONBOARDING_COOKIE, onboarded ? "1" : "0", {
            path: "/",
            maxAge: ONBOARDING_COOKIE_MAX_AGE,
            sameSite: "lax",
            httpOnly: false,
          });
        }
      }

      if (onboarded === false && !isOnboardingPage) {
        return redirectTo("/onboarding");
      }

      if (onboarded === true && isOnboardingPage) {
        return redirectTo("/");
      }
    }
  } catch {
    // Supabase unreachable — let the request through without auth gating
  }

  return supabaseResponse;
}

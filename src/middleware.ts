import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize rate limiter at module scope for middleware (Edge Runtime compatible)
// Returns null if Redis is not configured
function createGlobalLimiter(): Ratelimit | null {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token || url.startsWith("your_")) {
        return null;
    }

    const redis = new Redis({ url, token });

    return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"),
        prefix: "ratelimit:global",
        analytics: true,
    });
}

const globalLimiter = createGlobalLimiter();

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

export async function middleware(request: NextRequest) {
    // --- Global Rate Limiting ---
    if (globalLimiter) {
        const ip = getClientIp(request);

        try {
            const { success: allowed } = await globalLimiter.limit(ip);
            if (!allowed) {
                return new NextResponse(
                    JSON.stringify({ error: "Too many requests. Please slow down." }),
                    {
                        status: 429,
                        headers: {
                            "Content-Type": "application/json",
                            "Retry-After": "60",
                        },
                    }
                );
            }
        } catch {
            // If Redis is unreachable, allow the request through
        }
    }

    // --- Supabase Auth ---
    let response = NextResponse.next({
        request: { headers: request.headers },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value);
                        response = NextResponse.next({
                            request: { headers: request.headers },
                        });
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Auth routes — redirect authenticated users based on role
    if (pathname.startsWith("/login") || pathname.startsWith("/verify")) {
        if (user) {
            // Check if user is admin
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profile?.role === "admin") {
                return NextResponse.redirect(new URL("/admin", request.url));
            }
            return NextResponse.redirect(new URL("/services", request.url));
        }
        return response;
    }

    // Protected dashboard routes
    if (pathname.startsWith("/dashboard")) {
        if (!user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
        return response;
    }

    // Protected services routes
    if (pathname.startsWith("/services")) {
        if (!user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
        return response;
    }

    // Cow donation page (standalone)
    if (pathname.startsWith("/cow-donation")) {
        if (!user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
        return response;
    }

    // Admin routes — require admin role
    if (pathname.startsWith("/admin")) {
        if (!user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        // Check admin role
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        return response;
    }

    return response;
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/services/:path*",
        "/cow-donation",
        "/admin/:path*",
        "/login",
        "/verify",
    ],
};

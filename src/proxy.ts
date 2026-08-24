import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    const isAuthRoute =
        request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/api/auth");

    // Exclude public routes and static files
    if (isAuthRoute || request.nextUrl.pathname === "/") {
        return NextResponse.next();
    }

    // Call the Better Auth session endpoint using request origin
    try {
        const sessionRes = await fetch(
            `${request.nextUrl.origin}/api/auth/get-session`,
            {
                headers: {
                    cookie: request.headers.get("cookie") || "",
                },
            },
        );

        const session = await sessionRes.json();

        if (!session || !session.session) {
            const loginUrl = new URL("/login", request.url);
            return NextResponse.redirect(loginUrl);
        }
    } catch (error) {
        console.error("Proxy session check failed:", error);
        // On error, safely redirect to login
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

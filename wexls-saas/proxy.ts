import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const isAuth = !!token;
        const path = req.nextUrl.pathname;

        // Check if the user is authorized for the dashboard they're trying to access
        if (path.startsWith("/dashboard/teacher") && token?.role !== "TEACHER" && token?.role !== "ORG_ADMIN") {
            return NextResponse.redirect(new URL("/dashboard/student", req.url));
        }

        if (path.startsWith("/dashboard/org-admin") && token?.role !== "ORG_ADMIN" && token?.role !== "SUPER_ADMIN") {
            return NextResponse.redirect(new URL("/dashboard/teacher", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/practice/:path*",
        "/api/scoped/:path*",
    ],
};

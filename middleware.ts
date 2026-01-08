import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// We can't use the Firebase Admin SDK easily in standard middleware without specific setup
// So we'll use a cookie-based approach or check for the existence of a session cookie
// For this demo, we'll implement a simple redirect based on path
// REAL SECURITY requires server-side session verification

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Example path protection
    if (pathname.startsWith('/dashboard')) {
        // In a real app, verify the token via Firebase Admin
        // const session = request.cookies.get('session');
        // if (!session) return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/activate'],
};

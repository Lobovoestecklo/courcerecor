import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

// Wrap NextAuth in try-catch to prevent middleware failures
let authHandler: any;

try {
  authHandler = NextAuth(authConfig).auth;
} catch (error) {
  console.error('❌ [MIDDLEWARE] Failed to initialize NextAuth:', error);
  // Fallback handler that allows all requests
  authHandler = (request: any) => {
    console.warn(
      '⚠️ [MIDDLEWARE] Using fallback handler due to NextAuth initialization failure',
    );
    return new Response(null, { status: 200 });
  };
}

export default authHandler;

export const config = {
  matcher: ['/', '/:id', '/api/:path*', '/login', '/register'],
};

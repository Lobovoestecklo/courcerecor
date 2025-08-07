import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Разрешаем доступ к API routes и статическим файлам
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  // Разрешаем доступ к страницам аутентификации
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return NextResponse.next();
  }

  // Для всех остальных страниц проверяем сессию
  // В Edge Runtime мы не можем проверить сессию, поэтому просто пропускаем
  // Аутентификация будет происходить на уровне страниц
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/:id', '/api/:path*', '/login', '/register'],
};

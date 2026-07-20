import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_ROLES = ['superadmin', 'admin', 'editor'];

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  // Get hostname of request (e.g. rentacar.example.com, localhost:3000)
  const hostname = req.headers.get('host') || '';

  // Inject pathname into headers for layout access
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', url.pathname);

  // Protect /admin route (Admin Panel Route Guard)
  if (url.pathname.startsWith('/admin')) {
    // Giriş sayfasına erişime izin ver
    if (url.pathname === '/admin/login') {
      // devam etmesine izin vermek için bloktan çık
    } else {
      const adminToken = req.cookies.get('admin_token')?.value;
      
      if (!adminToken) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }
      
      try {
        // Basic decode of JWT payload (Edge Runtime'da jsonwebtoken kütüphanesi çalışmadığı için atob ile çözülür)
        const payloadBase64 = adminToken.split('.')[1];
        const payloadString = atob(payloadBase64);
        const payload = JSON.parse(payloadString);
        
        if (!payload.role || !ADMIN_ROLES.includes(payload.role)) {
          return NextResponse.redirect(new URL('/admin/login', req.url));
        }
      } catch (e) {
        // Invalid token format
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }
    }
  }

  // Determine the subdomain/domain logic
  // For local testing, we can check for custom ports or specific keywords in the host
  if (hostname.includes('rentacar') || hostname.startsWith('rentacar-')) {
    // Rewrite all requests to the Rent A Car sub-application directory
    return NextResponse.rewrite(new URL(`/rentacar${url.pathname}`, req.url), {
      request: { headers: requestHeaders },
    });
  } else if (hostname.includes('produksiyon') || hostname.startsWith('production-')) {
    // Rewrite to Production sub-application
    return NextResponse.rewrite(new URL(`/production${url.pathname}`, req.url), {
      request: { headers: requestHeaders },
    });
  }

  // Default behavior (Main corporate site or ecommerce hub)
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Ignore api routes, _next paths, and static files
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

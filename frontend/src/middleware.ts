import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  // Get hostname of request (e.g. rentacar.visionarc.com, localhost:3000)
  const hostname = req.headers.get('host') || '';

  // Determine the subdomain/domain logic
  // For local testing, we can check for custom ports or specific keywords in the host
  if (hostname.includes('rentacar') || hostname.startsWith('rentacar-')) {
    // Rewrite all requests to the Rent A Car sub-application directory
    return NextResponse.rewrite(new URL(`/rentacar${url.pathname}`, req.url));
  } else if (hostname.includes('produksiyon') || hostname.startsWith('production-')) {
    // Rewrite to Production sub-application
    return NextResponse.rewrite(new URL(`/production${url.pathname}`, req.url));
  }

  // Default behavior (Main corporate site or ecommerce hub)
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Ignore api routes, _next paths, and static files
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Проверяем наличие UTM-параметров
  const url = request.nextUrl;
  const utmSource = url.searchParams.get('utm_source');
  const utmMedium = url.searchParams.get('utm_medium');
  const utmCampaign = url.searchParams.get('utm_campaign');
  const utmContent = url.searchParams.get('utm_content');
  const utmTerm = url.searchParams.get('utm_term');
  const ref = url.searchParams.get('ref');
  
  // Если есть UTM-параметры, сохраняем их в cookies
  if (utmSource || ref) {
    const trackingData = {
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      ref: ref,
      referrer: request.headers.get('referer'),
      timestamp: Date.now()
    };
    
    // Сохраняем данные в cookie на 30 дней
    response.cookies.set('tracking_data', JSON.stringify(trackingData), {
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      httpOnly: false, // Разрешаем доступ из JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 
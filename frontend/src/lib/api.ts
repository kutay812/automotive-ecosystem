// In Docker, INTERNAL_API_URL should be http://backend:1337
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://127.0.0.1:1337';

// In Browser, STRAPI_URL should be http://localhost:1337 (or your domain)
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

/**
 * Normalizes media URLs. If it starts with /uploads, prepends the backend URL.
 */
export function getMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads')) return `${STRAPI_URL}${url}`;
  return url;
}

/**
 * Generic fetch wrapper for Strapi Backend
 * @param path API endpoint path (e.g. '/api/cars')
 * @param options Fetch options
 */
export async function fetchAPI(path: string, options: RequestInit = {}) {
  try {
    const { headers, ...restOptions } = options;
    const response = await fetch(`${INTERNAL_API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      ...restOptions,
    });

    if (!response.ok) {
      // 401 veya başka hata gelirse terminali/uygulamayı NextJS kırmızı ekranıyla çökertmemek için sessizce objeyi döndür
      return { error: true, status: response.status };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return { error: true, message: 'Network Fetch Error' };
  }
}

export async function getCars() {
  return await fetchAPI('/api/cars?populate=*');
}

export async function getProjects() {
  return await fetchAPI('/api/projects?populate=*');
}

export async function getOffices() {
  return await fetchAPI('/api/offices?filters[isActive][$eq]=true');
}

export async function getActiveRentals() {
  // Fetch rentals that are not cancelled or finished, to prevent double booking
  return await fetchAPI('/api/rentals?filters[rentalStatus][$notIn][0]=bitti&filters[rentalStatus][$notIn][1]=iptal&populate=car');
}

export async function submitLead(data: any) {
  return await fetchAPI('/api/leads', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

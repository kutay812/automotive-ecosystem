const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:1337';
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

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

export async function submitLead(data: any) {
  return await fetchAPI('/api/leads', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

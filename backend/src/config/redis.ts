import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let isConnected = false;

export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  retryStrategy: (times) => {
    if (times > 3) {
      // 3 denemeden sonra durdur (lokal ortamda redis yoksa spam yapmasın)
      return null;
    }
    return Math.min(times * 500, 2000);
  },
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on('connect', () => {
  isConnected = true;
  console.log('⚡ Redis bağlantısı kuruldu.');
});

redis.on('error', (err) => {
  if (isConnected) {
    console.warn('⚠️ Redis hatası:', err.message);
  }
  isConnected = false;
});

// Otomatik bağlanmayı dene
redis.connect().catch(() => {
  console.log('ℹ️ Redis sunucusuna bağlanılamadı. Uygulama önbelleksiz doğrudan veritabanı modunda çalışmaya devam ediyor.');
});

export async function getCache<T = any>(key: string): Promise<T | null> {
  if (!isConnected) return null;
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
  if (!isConnected) return;
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch {
    // Silent fallback
  }
}

export async function invalidateCache(...keysOrPrefixes: string[]): Promise<void> {
  if (!isConnected) return;
  try {
    for (const item of keysOrPrefixes) {
      if (item.endsWith('*')) {
        const keys = await redis.keys(item);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else {
        await redis.del(item);
      }
    }
  } catch {
    // Silent fallback
  }
}

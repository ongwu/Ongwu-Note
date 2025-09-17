// JWT验证结果缓存
interface JwtCacheItem {
  userId: number;
  username: string;
  timestamp: number;
  ttl: number;
}

class JwtCache {
  private cache = new Map<string, JwtCacheItem>();

  set(token: string, userId: number, username: string, ttl: number = 30000) {
    this.cache.set(token, {
      userId,
      username,
      timestamp: Date.now(),
      ttl
    });
  }

  get(token: string): { userId: number; username: string } | null {
    const item = this.cache.get(token);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(token);
      return null;
    }

    return {
      userId: item.userId,
      username: item.username
    };
  }

  clear() {
    this.cache.clear();
  }

  // 清除特定token的缓存
  clearToken(token: string) {
    this.cache.delete(token);
  }
}

export const jwtCache = new JwtCache();

// 速率限制存储结构
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 速率限制检查函数 (适配 Pages)
export async function checkRateLimit(
  kv: KVNamespace | undefined,
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
  // 在 Pages 玎境中，优先使用绑定的 KV
  if (kv && typeof kv.get === 'function') {
    return checkRateLimitKV(kv, identifier, maxRequests, windowMs);
  }

  // 如果没有配置 KV，降级到内存存储
  return checkRateLimitMemory(identifier, maxRequests, windowMs);
}

// KV存储实现
async function checkRateLimitKV(
  kv: KVNamespace,
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
  const key = `rate_limit:${identifier}`;
  const now = Date.now();
  
  try {
    // 原子操作获取当前计数
    const entryStr = await kv.get(key, { cacheTtl: 0 }); // 禁用缓存获取最新值
    let entry: RateLimitEntry | null = null;
    
    if (entryStr) {
      try {
        entry = JSON.parse(entryStr) as RateLimitEntry;
      } catch {
        // 无效数据时重置
        entry = null;
      }
    }
    
    if (!entry || entry.resetTime <= now) {
      // 第一次请求或窗口已过期，重置计数器
      const resetTime = now + windowMs;
      await kv.put(key, JSON.stringify({ 
        count: 1, 
        resetTime 
      }), { 
        expirationTtl: Math.ceil(windowMs / 1000),
        metadata: { 
          createdAt: now,
          maxRequests 
        }
      });
      return { allowed: true, resetTime, remaining: maxRequests - 1 };
    }
    
    // 原子递增计数器
    const newCount = entry.count + 1;
    await kv.put(key, JSON.stringify({ 
      count: newCount, 
      resetTime: entry.resetTime 
    }), { 
      expirationTtl: Math.ceil((entry.resetTime - now) / 1000) 
    });
    
    if (newCount > maxRequests) {
      return { allowed: false, resetTime: entry.resetTime, remaining: 0 };
    }
    
    return { allowed: true, resetTime: entry.resetTime, remaining: maxRequests - newCount };
  } catch (error) {
    // KV操作失败时，降级到内存存储
    console.error('Rate limit KV error, 降级到内存存储:', error);
    return checkRateLimitMemory(identifier, maxRequests, windowMs);
  }
}

// 内存存储作为备用方案
const memoryStore: Map<string, { entry: string; expiration: number }> = new Map();

function checkRateLimitMemory(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; resetTime?: number; remaining?: number } {
  const key = `rate_limit:${identifier}`;
  const now = Date.now();
  
  // 清理过期条目
  for (const [k, value] of memoryStore.entries()) {
    if (value.expiration <= now) {
      memoryStore.delete(k);
    }
  }
  
  const stored = memoryStore.get(key);
  let entry: RateLimitEntry | null = null;
  
  if (stored) {
    entry = JSON.parse(stored.entry) as RateLimitEntry;
  }
  
  // 如果没有记录或者窗口已过期，重置计数器
  if (!entry || entry.resetTime <= now) {
    const resetTime = now + windowMs;
    const newEntry = { count: 1, resetTime };
    memoryStore.set(key, {
      entry: JSON.stringify(newEntry),
      expiration: resetTime
    });
    return { allowed: true, resetTime, remaining: maxRequests - 1 };
  }
  
  // 如果达到限制
  if (entry.count >= maxRequests) {
    return { allowed: false, resetTime: entry.resetTime, remaining: 0 };
  }
  
  // 增加计数
  const newCount = entry.count + 1;
  const newEntry = { count: newCount, resetTime: entry.resetTime };
  memoryStore.set(key, {
    entry: JSON.stringify(newEntry),
    expiration: entry.resetTime
  });
  
  return { allowed: true, resetTime: entry.resetTime, remaining: maxRequests - newCount };
}

// 验证文件类型
export function isAllowedFileType(fileType: string, allowedTypes: string): boolean {
  if (!allowedTypes) return true; // 如果没有设置限制，则允许所有类型
  
  const allowedTypesArray = allowedTypes.split(',').map(type => type.trim());
  return allowedTypesArray.includes(fileType);
}

// 清理文件名，防止路径遍历攻击
export function sanitizeFileName(fileName: string): string {
  // 移除路径部分，只保留文件名
  let name = fileName.replace(/.*[/\\]/, '');
  
  // 移除危险字符
  name = name.replace(/[<>:"|?*\x00-\x1f]/g, '');
  
  // 防止特殊文件名
  if (name === '.' || name === '..') {
    name = 'unnamed';
  }
  
  // 防止隐藏文件（以.开头的文件）
  if (name.startsWith('.')) {
    name = 'unnamed' + name;
  }
  
  // 移除连续的点
  name = name.replace(/\.+/g, '.');
  
  // 确保文件名不以点结尾
  if (name.endsWith('.')) {
    name = name.slice(0, -1) + '_';
  }

  // 限制长度
  if (name.length > 255) {
    const extension = name.split('.').pop() || '';
    const nameWithoutExtension = name.substring(0, name.length - extension.length - 1);
    name = nameWithoutExtension.substring(0, 255 - extension.length - 1) + '.' + extension;
  }
  
  // 确保文件名不为空
  if (!name) {
    name = 'unnamed';
  }
  
  return name;
}
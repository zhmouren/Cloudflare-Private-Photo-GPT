import { createHmac } from 'node:crypto';

interface JWTHeader {
  alg: 'HS256';
  typ: 'JWT';
}

interface JWTPayload {
  [key: string]: any;
  exp?: number;
}

// 生成JWT令牌
export async function createJWT(payload: JWTPayload, secret: string): Promise<string> {
  const header: JWTHeader = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
    
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// 验证JWT令牌
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  if (!token || typeof token !== 'string') return null;
  
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !signature) return null;
    
    // 验证签名（恒定时间比较防止时序攻击）
    const expectedSignature = createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
    
    // 使用定时安全比较
    let diff = 0;
    for (let i = 0; i < signature.length; i++) {
      diff |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    if (diff !== 0) return null;
  
  try {
    const payload: JWTPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    
    // 检查过期时间
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

// 从请求中获取JWT令牌
export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  return null;
}
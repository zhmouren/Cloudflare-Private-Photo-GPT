import { checkRateLimit } from '../lib/security';
import { getTokenFromRequest, verifyJWT } from '../lib/auth';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // 速率限制检查（对访客观模式也有限制）
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitResult = await checkRateLimit(
    context.env.RATE_LIMIT_KV,
    `list:${ip}`,
    context.env.RATE_LIMIT_REQUESTS || 20,
    context.env.RATE_LIMIT_WINDOW_MS || 60000
  );
  
  if (!rateLimitResult.allowed) {
    return new Response('请求过于频繁，请稍后再试', { status: 429 });
  }

  // 验证JWT令牌（如果提供）
  const token = getTokenFromRequest(context.request);
  if (token) {
    const payload = await verifyJWT(token, context.env.JWT_SECRET);
    if (!payload || !payload.username || payload.username !== context.env.USERNAME) {
      return new Response('未授权', { status: 401 });
    }
  }
  
  try {
    const prefix = context.env.UPLOAD_PREFIX || ''
    const list = await context.env.R2.list({ prefix })
    
    // 过滤掉可能的路径遍历文件
    const filteredObjects = list.objects.filter(obj => 
      !obj.key.includes('../') && 
      !obj.key.includes('..\\') &&
      !obj.key.startsWith('/')
    );
    
    return Response.json(filteredObjects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      httpMetadata: obj.httpMetadata,
      customMetadata: obj.customMetadata
    })))
  } catch (error) {
    return new Response('获取列表失败', { status: 500 })
  }
}
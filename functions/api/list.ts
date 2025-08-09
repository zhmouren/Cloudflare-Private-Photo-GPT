import { checkRateLimit } from '../lib/security';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // 速率限制检查（对访客也有限制）
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
  
  const pwd = context.request.headers.get('x-password') || new URL(context.request.url).searchParams.get('password')
  const username = context.request.headers.get('x-username') || new URL(context.request.url).searchParams.get('username')
  
  // 如果提供了用户名和密码，则验证它们
  // 如果没有提供，则允许访客访问（无认证模式）
  if (pwd && username) {
    // 验证用户名和密码
    if (pwd !== context.env.PASSWORD || username !== context.env.USERNAME) {
      return new Response('未授权', { status: 401 })
    }
  }
  // 如果没有提供凭据，我们允许访问（访客模式）
  
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
}
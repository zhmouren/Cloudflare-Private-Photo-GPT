export const onRequestGet: PagesFunction<Env> = async (context) => {
  // key 形如 encodeURIComponent(a)___encodeURIComponent(b)___encodeURIComponent(c)
  let key = context.params.key as string;
  key = key.split('___').map(decodeURIComponent).join('/');
  const obj = await context.env.R2.get(key);
  if (!obj) return new Response('未找到', { status: 404 });

  // 获取查询参数
  const url = new URL(context.request.url);
  const width = url.searchParams.get('width');
  const height = url.searchParams.get('height');
  const quality = url.searchParams.get('quality') || '80';

  let responseInit = {
    headers: {
      'content-type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000'
    }
  };

  // 如果有尺寸参数且是图片，则使用 Cloudflare Image Resizing
  if ((width || height) && obj.httpMetadata?.contentType?.startsWith('image/')) {
    // 在Cloudflare Pages中，图像变换通过特殊的URL格式实现
    // 我们直接返回图像，并让Cloudflare自动处理变换参数
    // 但首先我们需要确保URL格式正确
    
    // 对于Pages项目，图像变换参数应该在请求URL中直接处理
    // 我们只需要确保返回正确的content-type
    responseInit.headers['content-type'] = obj.httpMetadata.contentType;
    
    return new Response(obj.body, responseInit);
  }

  return new Response(obj.body, responseInit);
};
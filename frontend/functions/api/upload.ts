// 计算当前存储使用量的辅助函数
async function getCurrentStorageUsage(bucket: R2Bucket, prefix: string = ''): Promise<number> {
  let totalSize = 0;
  let cursor: string | undefined = undefined;
  
  do {
    const list = await bucket.list({ prefix, cursor, limit: 1000 });
    for (const obj of list.objects) {
      totalSize += obj.size;
    }
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
  
  return totalSize;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const pwd = context.request.headers.get('x-password') || new URL(context.request.url).searchParams.get('password')
  const username = context.request.headers.get('x-username') || new URL(context.request.url).searchParams.get('username')
  
  // 验证用户名和密码（上传操作必须认证）
  if (!pwd || !username || pwd !== context.env.PASSWORD || username !== context.env.USERNAME) {
    return new Response('未授权', { status: 401 })
  }
  
  const form = await context.request.formData()
  const file = form.get('file') as File
  if (!file) return new Response('未选择文件', { status: 400 })
  
  // 检查文件大小限制
  const maxFileSize = context.env.MAX_FILE_SIZE_BYTES || 50 * 1024 * 1024; // 默认50MB
  if (file.size > maxFileSize) {
    return new Response(`文件大小超过限制 (${maxFileSize / (1024 * 1024)} MB)`, { status: 400 });
  }
  
  const path = (form.get('path') as string) || ''
  const prefix = context.env.UPLOAD_PREFIX || ''
  let key = (prefix + path + file.name).replace(/\/+/g, '/')
  if (key.startsWith('/')) key = key.slice(1)
  
  // 检查存储空间限制
  const maxStorage = context.env.MAX_STORAGE_BYTES || 6 * 1024 * 1024 * 1024; // 默认6GB
  const currentStorage = await getCurrentStorageUsage(context.env.R2, prefix);
  
  if (currentStorage + file.size > maxStorage) {
    return new Response(`存储空间不足 (最大 ${maxStorage / (1024 * 1024 * 1024)} GB)`, { status: 400 });
  }
  
  // 获取图片尺寸信息（如果是图片）
  let metadata: Record<string, any> = {}
  if (file.type.startsWith('image/')) {
    try {
      // 这里可以添加获取图片尺寸的逻辑
      // 由于Workers环境限制，我们只能存储文件大小信息
      metadata = {
        width: null,
        height: null,
        size: file.size,
        type: file.type
      }
    } catch (e) {
      // 忽略错误
    }
  }
  
  await context.env.R2.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type,
      contentLength: file.size
    },
    customMetadata: metadata
  })
  
  return Response.json({ success: true, key, metadata })
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const pwd = context.request.headers.get('x-password') || new URL(context.request.url).searchParams.get('password')
  const username = context.request.headers.get('x-username') || new URL(context.request.url).searchParams.get('username')
  
  // 验证用户名和密码（删除操作必须认证）
  if (!pwd || !username || pwd !== context.env.PASSWORD || username !== context.env.USERNAME) {
    return new Response('未授权', { status: 401 })
  }
  
  try {
    const body = await context.request.json() as { key?: string; keys?: string[] }
    
    if (body.key) {
      // 删除单个文件
      await context.env.R2.delete(body.key)
      return Response.json({ success: true })
    } else if (body.keys && Array.isArray(body.keys)) {
      // 批量删除文件
      await context.env.R2.delete(body.keys)
      return Response.json({ success: true })
    } else {
      return new Response('无效的请求参数', { status: 400 })
    }
  } catch (error) {
    return new Response('删除失败: ' + (error as Error).message, { status: 500 })
  }
}
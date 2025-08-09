export const listPhotos = async (bucket: R2Bucket) => {
  const objects = await bucket.list();
  return objects.objects.map(obj => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded?.toISOString(),
  }));
};

export const uploadPhoto = async (bucket: R2Bucket, file: File, key: string) => {
  try {
    const metadata = file.type.startsWith('image/') ? {
      width: null,
      height: null,
      size: file.size,
      type: file.type
    } : {};
    
    return await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
      customMetadata: metadata
    });
  } catch (error) {
    console.error('R2上传失败:', error);
    throw new Error(`文件上传失败: ${(error as Error).message}`);
  }
};
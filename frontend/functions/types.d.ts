export interface Env {
  R2: R2Bucket
  PASSWORD: string
  USERNAME: string
  MAX_STORAGE_BYTES: number // 最大存储空间（字节）
  MAX_FILE_SIZE_BYTES: number // 单个文件最大大小（字节）
  UPLOAD_PREFIX?: string
}
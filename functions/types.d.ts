export interface Env {
  R2: R2Bucket
  PASSWORD: string
  USERNAME: string // 添加用户名环境变量
  UPLOAD_PREFIX?: string
}
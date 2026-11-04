/// <reference types="vite/client" />

declare module "figma:asset/*" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Tên miền chính thức của web (VD: https://tripops.vn) để mã QR ký hợp đồng trỏ đúng trang. */
  readonly VITE_PUBLIC_APP_URL?: string;
}

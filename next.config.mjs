/** Next.js 설정
 * - serverActions(실험적) 활성화 및 모든 origin 허용
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
};

export default nextConfig;



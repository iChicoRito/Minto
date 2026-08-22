/** @type {import('next').NextConfig} */
const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig = {
  reactCompiler: true,
  ...(isStaticExport ? { output: "export", trailingSlash: true, basePath } : {}),
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  ...(!isStaticExport
    ? {
        async redirects() {
          return [
            {
              source: "/template/dashboard",
              destination: "/template/dashboard/default",
              permanent: false,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async redirects() {
    return [
      {
        source: "/template/dashboard",
        destination: "/template/dashboard/default",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

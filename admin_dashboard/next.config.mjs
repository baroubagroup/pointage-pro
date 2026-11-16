/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/pointage-pro.apk',
        destination: 'https://ylrnxuphtaoazlhlmnsd.supabase.co/storage/v1/object/public/apk_downloads/pointage-pro-v5.apk',
        permanent: false,
      },
      {
        source: '/pointage-pro-v5.apk',
        destination: 'https://ylrnxuphtaoazlhlmnsd.supabase.co/storage/v1/object/public/apk_downloads/pointage-pro-v5.apk',
        permanent: false,
      },
      {
        source: '/pointage-pro-v4.apk',
        destination: 'https://ylrnxuphtaoazlhlmnsd.supabase.co/storage/v1/object/public/apk_downloads/pointage-pro-v5.apk',
        permanent: false,
      },
      {
        source: '/pointage-pro-v3.apk',
        destination: 'https://ylrnxuphtaoazlhlmnsd.supabase.co/storage/v1/object/public/apk_downloads/pointage-pro-v5.apk',
        permanent: false,
      },
      {
        source: '/pointage.apk',
        destination: 'https://ylrnxuphtaoazlhlmnsd.supabase.co/storage/v1/object/public/apk_downloads/pointage-pro-v5.apk',
        permanent: false,
      },
      {
        source: '/download/apk',
        destination: '/apk',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ranchi-connect.vercel.app'
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/auth/', '/messages'] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

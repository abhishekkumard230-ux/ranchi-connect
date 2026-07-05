export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ranchi-connect.vercel.app'
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/messages`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
  ]
}

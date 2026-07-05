import { MapPin } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-emerald-500 shadow-xl animate-pulse mb-3">
          <MapPin className="h-7 w-7 text-white" />
        </div>
        <p className="text-sm text-muted-foreground">Loading Ranchi Connect…</p>
      </div>
    </div>
  )
}

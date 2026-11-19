import { Analytics } from '@vercel/analytics/react'
import { publicWeb } from './publicWeb'
import { anonymousPageView, canRecordVisits } from './analyticsPolicy'

/** Admin-only dashboard at Vercel; no public counters, custom events or user content. */
export default function SiteAnalytics() {
  if (!publicWeb || typeof window === 'undefined') return null
  const privacy = navigator as Navigator & { globalPrivacyControl?: boolean }
  if (!canRecordVisits(location.protocol, location.hostname, navigator.doNotTrack, privacy.globalPrivacyControl)) return null
  return <Analytics mode="production" debug={false} route="/" path="/" beforeSend={anonymousPageView} />
}

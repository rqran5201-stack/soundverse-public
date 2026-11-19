export const ANALYTICS_ORIGIN = 'https://soundverse-ivory.vercel.app'

export function canRecordVisits(protocol: string, hostname: string, doNotTrack: string | null | undefined, globalPrivacyControl: boolean | undefined): boolean {
  return protocol === 'https:' && hostname === 'soundverse-ivory.vercel.app' && doNotTrack !== '1' && globalPrivacyControl !== true
}

export function anonymousPageView(event: {type: 'pageview' | 'event'; url: string}): {type:'pageview';url:string} | null {
  if (event.type !== 'pageview') return null
  try {
    if (new URL(event.url).origin !== ANALYTICS_ORIGIN) return null
    // Only count site visits. Never retain private paths, IDs, query strings or hashes.
    return {type:'pageview',url:ANALYTICS_ORIGIN+'/'}
  } catch { return null }
}

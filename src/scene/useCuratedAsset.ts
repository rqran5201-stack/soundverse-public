import { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import type { LuxAsset } from '../luxAsset'

export type CuratedStatus = 'loading' | 'ready' | 'fallback'
/** Load an original pre-generated export. Never call a generation endpoint. */
export function useCuratedAsset(url: string, name: string, maxBytes = 15 * 1024 * 1024) {
  const [asset, setAsset] = useState<LuxAsset | null>(null)
  const [status, setStatus] = useState<CuratedStatus>('loading')
  const invalidate = useThree(s => s.invalidate)
  useEffect(() => {
    if (!url) { setAsset(null); setStatus('fallback'); return }
    const controller = new AbortController()
    let loaded: LuxAsset | null = null
    const timer = setTimeout(() => controller.abort(), 12000)
    setAsset(null); setStatus('loading')
    void (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok || Number(response.headers.get('content-length')) > maxBytes) throw Error('Export unavailable')
        const buffer = await response.arrayBuffer()
        if (buffer.byteLength > maxBytes) throw Error('Export too large')
        const { parseAsset } = await import('../luxAsset')
        loaded = await parseAsset(buffer, name, controller.signal)
        if (controller.signal.aborted) { const { disposeAsset } = await import('../luxAsset'); disposeAsset(loaded); loaded = null; return }
        loaded.scene.traverse(object => { if ('isMesh' in object) { object.castShadow = true; object.receiveShadow = true } })
        setAsset(loaded); setStatus('ready'); invalidate()
      } catch {
        if (controller.signal.reason !== 'unmounted') setStatus('fallback')
      } finally { clearTimeout(timer) }
    })()
    return () => {
      controller.abort('unmounted'); clearTimeout(timer)
      const toDispose = loaded
      if (toDispose) void import('../luxAsset').then(({ disposeAsset }) => disposeAsset(toDispose))
    }
  }, [url, name, maxBytes, invalidate])
  return { asset, status }
}

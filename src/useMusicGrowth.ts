import { useEffect, type RefObject } from 'react'
import type { AudioSignals } from './audio/signals'
import { musicExposure } from './worlds/growth'

/** Audio stays local. Writes are batched, never tied to the WebGL frame rate. */
export function useMusicGrowth(signals: RefObject<AudioSignals>, enabled: boolean, advance: (amount: number) => void) {
  useEffect(() => {
    if (!enabled) return
    let previous = performance.now(), lastPublish = previous, pending = 0
    const flush = () => { if (pending > 0) { advance(pending); pending = 0 } }
    const timer = window.setInterval(() => {
      const now = performance.now(), seconds = (now - previous) / 1000
      previous = now
      if (document.visibilityState === 'visible') pending += musicExposure(signals.current, seconds)
      if (now - lastPublish >= 1000) { flush(); lastPublish = now }
    }, 100)
    return () => { window.clearInterval(timer); flush() }
  }, [signals, enabled, advance])
}

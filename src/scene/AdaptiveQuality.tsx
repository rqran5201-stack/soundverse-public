import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/** Demote once after warm-up and a sustained slow window; explicit High is respected. */
export default function AdaptiveQuality({ enabled, onSlow }: { enabled: boolean; onSlow: () => void }) {
  const sample = useRef({ previous: 0, warmup: 0, elapsed: 0, frames: 0, fired: false })
  useFrame(() => {
    const s = sample.current
    const now = performance.now()
    if (!enabled || document.visibilityState === 'hidden') { s.previous = 0; return }
    if (s.fired) return
    if (!s.previous) { s.previous = now; return }
    const dt = now - s.previous; s.previous = now
    s.warmup += dt
    if (s.warmup < 2000) return
    s.elapsed += dt; s.frames++
    if (s.elapsed >= 2000 && s.frames >= 12) {
      if (s.elapsed / s.frames > 45) { s.fired = true; onSlow() }
      s.elapsed = 0; s.frames = 0
    }
  })
  return null
}

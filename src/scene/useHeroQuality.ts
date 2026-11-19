import { useEffect, useState } from 'react'

export type HeroQuality = 'auto' | 'high' | 'low'

/** Device hints are a conservative default, not a performance measurement. */
export function useHeroLowQuality(choice: HeroQuality) {
  const [small, setSmall] = useState(() => matchMedia('(max-width: 640px)').matches)
  useEffect(() => {
    const media = matchMedia('(max-width: 640px)')
    const change = () => setSmall(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  if (choice !== 'auto') return choice === 'low'
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return small || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) || (memory !== undefined && memory <= 4)
}

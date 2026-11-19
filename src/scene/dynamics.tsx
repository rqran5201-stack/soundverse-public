import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { silentSignals, type AudioSignals } from '../audio/signals'
import type { WorldId } from '../storage'

export type Dynamics = { time: number; wind: number; tide: number; shimmer: number; pulse: number }
const DynamicsContext = createContext<RefObject<Dynamics> | null>(null)
export function DynamicsProvider({ signals, reduced, worldId, children }: {
  signals?: RefObject<AudioSignals>; reduced: boolean; worldId: WorldId; children: ReactNode
}) {
  const frame = useRef<Dynamics>({ time: 0, wind: .018, tide: 0, shimmer: 0, pulse: 0 })
  useFrame(({ clock }) => {
    const audio = signals?.current ?? silentSignals()
    frame.current = {
      time: reduced ? 0 : clock.elapsedTime,
      wind: reduced ? 0 : .018 + audio.mid * (worldId === 'field' ? .065 : .045) + audio.low * .018,
      tide: reduced ? 0 : audio.low,
      shimmer: reduced ? 0 : audio.high,
      pulse: reduced ? 0 : audio.onset,
    }
  }, -1)
  return <DynamicsContext.Provider value={frame}>{children}</DynamicsContext.Provider>
}
export function useDynamics() {
  const frame = useContext(DynamicsContext)
  if (!frame) throw new Error('World motion must run inside DynamicsProvider')
  return frame
}
export const windPhase = (time: number, x: number, z: number) => Math.sin(time * .65 - x * .15 - z * .12) + .3 * Math.sin(time * 1.1 + z * .3)

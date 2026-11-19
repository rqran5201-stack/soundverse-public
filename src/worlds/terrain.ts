import { coastHeight, groundHeight } from '../dreamscape.ts'
import type { WorldId } from '../storage'
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

export const moonCreekX = (z: number) => 6.6 + Math.sin(z * .15) * 1.5
export const fieldPathX = (z: number) => -2 + 2.8 * Math.sin(z * .135 + .8)

/** Legacy planted objects stay grounded: the central 4-unit clearing is unchanged. */
export function worldGroundHeight(world: WorldId, x: number, z: number) {
  if (world === 'sea') return coastHeight(x, z)
  const r = Math.hypot(x, z)
  if (r <= 4) return groundHeight(x, z)
  const inner = groundHeight(x * 4 / r, z * 4 / r)
  const creek = moonCreekX(z)
  const outer = world === 'moon'
    ? .4 + .3 * Math.sin(x * .23) * Math.cos(z * .2) + (r / 28) ** 2 * 2 - 1.5 * Math.exp(-(((x - creek) / 1.5) ** 2))
    : .8 + .65 * Math.sin(x * .18 + z * .14) + .28 * Math.cos(z * .3) - smooth(5, 11, x + Math.sin(z * .17) * 1.8) * 3.5
  const t = smooth(4, 6.3, r)
  return inner * (1 - t) + outer * t
}

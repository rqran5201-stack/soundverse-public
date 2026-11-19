import type { Seed } from '../storage'
export type ObjectTransform = { x: number; z: number; size: number; rotation: number }
export type TransformCommand = { id: string; before: ObjectTransform; after: ObjectTransform }
export const PLACEMENT_RADIUS = 3.8
const finite = (n: number, fallback: number) => Number.isFinite(n) ? n : fallback
export function objectTransform(seed: Seed): ObjectTransform {
  return { x: seed.x, z: seed.z, size: seed.size ?? 1, rotation: seed.rotation ?? 0 }
}
export function normalizeTransform(value: ObjectTransform): ObjectTransform {
  let x = finite(value.x, 0), z = finite(value.z, 0)
  const radius = Math.hypot(x, z)
  if (radius > PLACEMENT_RADIUS) { x = x / radius * PLACEMENT_RADIUS; z = z / radius * PLACEMENT_RADIUS }
  const angle = finite(value.rotation, 0) % (Math.PI * 2)
  return { x, z, size: Math.max(.5, Math.min(2, finite(value.size, 1))), rotation: angle < 0 ? angle + Math.PI * 2 : angle }
}
/** Transform-only patches must never restore old growth or paid task state. */
export function applyTransform(seed: Seed, transform: ObjectTransform): Seed {
  return { ...seed, ...transform }
}
export function sameTransform(a: ObjectTransform, b: ObjectTransform) {
  return (['x','z','size','rotation'] as const).every(key => Math.abs(a[key] - b[key]) < 1e-7)
}

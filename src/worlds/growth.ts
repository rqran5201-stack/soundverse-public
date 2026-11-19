import type { AudioSignals } from '../audio/signals'

export const SEED_KINDS = ['flower', 'mushroom', 'tree'] as const
export type SeedKind = typeof SEED_KINDS[number]
export const KIND_LABELS: Record<SeedKind, string> = { flower: '花朵', mushroom: '蘑菇', tree: '树木' }

/** A transparent keyword suggestion, not an LLM or an understanding of emotions. */
export function suggestWishKind(text: string): SeedKind {
  if (/蘑菇|菌|mushroom/i.test(text)) return 'mushroom'
  if (/树|tree/i.test(text)) return 'tree'
  if (/花|flower|blossom/i.test(text)) return 'flower'
  return 'tree'
}
export function growthValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1
}
export function growthStage(value: unknown): string {
  const growth = growthValue(value)
  return growth < .35 ? '萌芽' : growth < .75 ? '舒展' : growth < 1 ? '绽放' : '已长成'
}
/** Bounded audible exposure; no tempo/emotion claim. Hidden tabs and pauses are gated by caller. */
export function musicExposure(audio: AudioSignals, seconds: number): number {
  if (!audio.active || !Number.isFinite(audio.level) || audio.level <= .015) return 0
  const dt = Number.isFinite(seconds) ? Math.max(0, Math.min(.25, seconds)) : 0
  const safe = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
  const energy = safe((audio.level - .015) / .6)
  return dt * energy * (.75 + safe(audio.mid) * .2 + safe(audio.onset) * .05) / 35
}

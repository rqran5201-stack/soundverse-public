import { readMusicEvent, type MusicEvent } from './worlds/musicGarden.ts'
import { normalizeTransform } from './worlds/transforms.ts'
import { SEED_KINDS, growthValue, type SeedKind } from './worlds/growth.ts'
export const STORAGE_KEY = 'soundverse-alpha-worlds-v1'
export const WORLD_IDS = ['sea', 'moon', 'field'] as const
export type WorldId = typeof WORLD_IDS[number]
export type Seed = { projectId?: string; id: string; x: number; z: number; wish: string; worldId: WorldId; source?: 'music'; music?: MusicEvent; kind?: SeedKind; growth?: number; size?: number; rotation?: number; luxJobId?: string; luxSubmissionUncertain?: boolean }

export function readSeeds(): Seed[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(stored)) return []
    const seen = new Set<string>()
    return stored.flatMap((value: unknown): Seed[] => {
      if (!value || typeof value !== 'object') return []
      const seed = value as Record<string, unknown>
      const worldId = seed.worldId === undefined ? 'sea' : seed.worldId
      if (typeof seed.id !== 'string' || !seed.id || seen.has(seed.id)
        || typeof seed.x !== 'number' || !Number.isFinite(seed.x)
        || typeof seed.z !== 'number' || !Number.isFinite(seed.z)
        || typeof seed.wish !== 'string' || !seed.wish.trim()
        || !WORLD_IDS.includes(worldId as WorldId)) return []
      seen.add(seed.id)
      const music=seed.source==='music'?readMusicEvent(seed.music):undefined
      const transform = normalizeTransform({x:0,z:0,size:typeof seed.size === 'number' ? seed.size : 1,rotation:typeof seed.rotation === 'number' ? seed.rotation : 0})
      return [{ ...(music?{source:'music' as const,music}:{}), ...(typeof seed.size === 'number' ? {size:transform.size} : {}), ...(typeof seed.rotation === 'number' ? {rotation:transform.rotation} : {}), ...(seed.luxSubmissionUncertain === true ? {luxSubmissionUncertain:true} : {}), ...(SEED_KINDS.includes(seed.kind as SeedKind) ? { kind: seed.kind as SeedKind } : {}), ...(typeof seed.growth === 'number' ? { growth: growthValue(seed.growth) } : {}),  ...(typeof seed.projectId === 'string' ? { projectId: seed.projectId } : {}), id: seed.id, x: seed.x, z: seed.z, wish: seed.wish, worldId: worldId as WorldId, ...(typeof seed.luxJobId === 'string' && /^[a-f0-9-]{36}$/.test(seed.luxJobId) ? { luxJobId: seed.luxJobId } : {}) }]
    })
  } catch { return [] }
}

export const PROJECTS_KEY = 'soundverse-private-projects-v1'
export type Project = { id: string; worldId: WorldId; name: string }
export const defaultProjectId = (worldId: WorldId) => 'default-' + worldId
export const seedProjectId = (seed: Seed) => seed.projectId ?? defaultProjectId(seed.worldId)

export function readProjects(): Project[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((project): project is Project =>
      project && typeof project.id === 'string' && WORLD_IDS.includes(project.worldId)
      && typeof project.name === 'string' && project.name.trim().length > 0)
  } catch {
    return []
  }
}

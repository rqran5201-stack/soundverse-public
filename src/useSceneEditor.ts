import { worldGroundHeight, moonCreekX, fieldPathX } from './worlds/terrain'
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { seedProjectId, type Seed } from './storage'
import { applyTransform, normalizeTransform, objectTransform, sameTransform, type ObjectTransform, type TransformCommand } from './worlds/transforms'
type History = { past: TransformCommand[]; future: TransformCommand[] }
export function useSceneEditor(seeds: Seed[], setSeeds: Dispatch<SetStateAction<Seed[]>>, projectId: string, active: boolean) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const [histories, setHistories] = useState<Partial<Record<string, History>>>({})
  const selected = active ? seeds.find(seed => seedProjectId(seed) === projectId && seed.id === selectedId) : undefined
  useEffect(() => { setSelectedId(null); setPlacing(false) }, [projectId, active])
  const select = useCallback((id: string | null) => { setSelectedId(id); setPlacing(false) }, [])
  const apply = useCallback((value: ObjectTransform) => {
    if (!selected) return
    const before = objectTransform(selected)
    const normalized = normalizeTransform(value)
    let after = normalized
    if (selected.music?.motif || selected.id.startsWith('growth-v2-')) {
      const {x,z} = value
      const world = selected.worldId
      const valid = Math.abs(x) <= 24 && Math.abs(z) <= 24 && worldGroundHeight(world,x,z) > .15
        && (world !== 'moon' || Math.abs(x - moonCreekX(z)) >= 3)
        && (world !== 'field' || Math.abs(x - fieldPathX(z)) >= 1.7)
      after = { ...normalized, x: valid ? x : before.x, z: valid ? z : before.z }
    }
    if (sameTransform(before, after)) { setPlacing(false); return }
    const command = { id:selected.id, before, after }
    setSeeds(previous => previous.map(seed => seed.id === selected.id && seedProjectId(seed) === projectId ? applyTransform(seed, after) : seed))
    setHistories(previous => ({...previous,[projectId]:{past:[...(previous[projectId]?.past ?? []),command].slice(-30),future:[]}}))
    setPlacing(false)
  }, [selected, projectId, setSeeds])
  const place = useCallback((x:number,z:number) => { if(selected) apply({...objectTransform(selected),x,z}) }, [selected,apply])
  function replay(redo: boolean) {
    const history = histories[projectId] ?? {past:[],future:[]}, source = redo ? history.future : history.past, command = source.at(-1)
    if (!active || !command) return
    setSeeds(previous => previous.map(seed => seed.id === command.id && seedProjectId(seed) === projectId ? applyTransform(seed, redo ? command.after : command.before) : seed))
    setHistories(previous => { const h = previous[projectId] ?? history; return {...previous,[projectId]:redo ? {past:[...h.past,command],future:h.future.slice(0,-1)} : {past:h.past.slice(0,-1),future:[...h.future,command]}} })
    setSelectedId(command.id); setPlacing(false)
  }
  useEffect(() => {
    if (!placing) return
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') setPlacing(false) }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [placing])
  return { selected, selectedId: selected?.id ?? null, select, placing:!!selected && placing, setPlacing, apply,
    place,
    undo:()=>replay(false),redo:()=>replay(true),canUndo:!!histories[projectId]?.past.length,canRedo:!!histories[projectId]?.future.length }
}
export type SceneEditor = ReturnType<typeof useSceneEditor>

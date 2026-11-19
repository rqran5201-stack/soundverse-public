import { SeaReef } from './MoonForestAssets'
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Color, Fog } from 'three'
import type { WorldId } from '../storage'
import { WORLD_DEFINITIONS } from '../worlds/definitions'

const seasons = {
  spring: ['春', '#ffc6e3'],
  summer: ['夏', '#fff0bc'],
  autumn: ['秋', '#ffac67'],
  winter: ['冬', '#b4ddff'],
} as const
const times = {
  dawn: ['清晨', '#e3a6aa'],
  day: ['白昼', '#b5dceb'],
  dusk: ['黄昏', '#dc927e'],
  night: ['夜晚', '#152547'],
} as const
const layers = { ground: '地面', sky: '空中', sea: '海底' } as const

export type Exploration = { season: keyof typeof seasons; time: keyof typeof times; layer: keyof typeof layers }
export const DEFAULT_EXPLORATION: Exploration = { season: 'summer', time: 'day', layer: 'ground' }

export function ExplorationControls({ value, onChange, placing }: { value: Exploration; onChange: (value: Exploration) => void; placing?: boolean }) {
  return <details className="exploration">
    <summary data-time={value.time}>世界探索</summary>
    <label>季节<select value={value.season} onChange={event => onChange({...value, season: event.target.value as Exploration['season']})}>
      {Object.entries(seasons).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    <label>时辰<select value={value.time} onChange={event => onChange({...value, time: event.target.value as Exploration['time']})}>
      {Object.entries(times).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    <label>视角<select disabled={placing} value={value.layer} onChange={event => onChange({...value, layer: event.target.value as Exploration['layer']})}>
      {Object.entries(layers).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
  </details>
}

export function ExplorationEnvironment({ exploration, worldId, placing }: { exploration: Exploration; worldId: WorldId; placing?: boolean }) {
  const { camera, scene, invalidate } = useThree()
  const layer = placing ? 'ground' : exploration.layer
  const { season, time } = exploration
  useEffect(() => {
    if (layer === 'ground') {
      camera.position.set(...WORLD_DEFINITIONS[worldId].camera)
      camera.lookAt(...WORLD_DEFINITIONS[worldId].target)
    } else if (layer === 'sky') {
      camera.position.set(26, 37, 35)
      camera.lookAt(0, 0, -8)
    } else {
      camera.position.set(12, -5, 17)
      camera.lookAt(0, -7, 0)
    }
    invalidate()
  }, [camera, invalidate, layer, worldId])

  useEffect(() => {
    if (layer !== 'sea' && season === 'summer' && time === 'day') return
    const background = scene.background
    const fog = scene.fog
    const moonNight = worldId === 'moon' && time === 'night' && layer !== 'sea'
    const color = new Color(moonNight ? '#263740' : layer === 'sea' ? '#155665' : times[time][1])
    if (layer !== 'sea') color.lerp(new Color(seasons[season][1]), time === 'night' ? .05 : .16)
    scene.background = color
    scene.fog = new Fog(color, layer === 'sea' ? 5 : moonNight ? 12 : 24, layer === 'sea' ? 38 : moonNight ? 62 : 110)
    const water: { value: number }[] = []
    scene.traverse(object => {
      const material = (object as import('three').Mesh).material
      if (material && !Array.isArray(material) && 'uniforms' in material) {
        const daylight = (material as import('three').ShaderMaterial).uniforms.daylight
        if (daylight) { daylight.value = { dawn: .68, day: 1, dusk: .57, night: moonNight ? .72 : .18 }[time]; water.push(daylight) }
      }
    })
    invalidate()
    return () => { water.forEach(uniform => { uniform.value = 1 }); scene.background = background; scene.fog = fog; invalidate() }
  }, [invalidate, layer, scene, season, time, worldId])

  useEffect(() => {
    if (layer === 'sea' || (time === 'day' && season === 'summer')) return
    const restore: (() => void)[] = []
    scene.traverse(object => {
      if (!('isDirectionalLight' in object) || !object.isDirectionalLight) return
      const light = object as import('three').DirectionalLight
      const color = light.color.clone()
      const intensity = light.intensity
      const position = light.position.clone()
      light.color.lerp(new Color(times[time][1]), time === 'day' ? .1 : .46)
      light.intensity *= { dawn: .72, day: 1, dusk: .64, night: worldId === 'moon' ? .62 : .28 }[time]
      if (time === 'dawn' || time === 'dusk') light.position.set(time === 'dawn' ? -13 : 13, 5, position.z)
      restore.push(() => { light.color.copy(color); light.intensity = intensity; light.position.copy(position) })
    })
    invalidate()
    return () => { restore.forEach(reset => reset()); invalidate() }
  }, [invalidate, layer, scene, season, time, worldId])

  return <>
    {(season !== 'summer' || time !== 'day') && layer !== 'sea' &&
      <hemisphereLight args={[times[time][1], seasons[season][1], time === 'night' ? 0.65 : 1.3]} />}
    {layer === 'sea' && <group position={[0, -9, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[100, 100]}/><meshStandardMaterial color="#34716e" roughness={1}/></mesh>
      <SeaReef fallback={Array.from({length: 12}, (_, index) => {
        const angle = index * 2.39996
        const radius = 3 + Math.sqrt(index) * 2.8
        return <mesh key={index} position={[Math.cos(angle) * radius, 0.6, Math.sin(angle) * radius]} rotation={[0, angle, 0.18]} scale={[1, 0.5 + (index % 5) * 0.25, 1]}>
          <coneGeometry args={[0.35, 1.9, 5]}/><meshStandardMaterial color={index % 3 === 0 ? '#ce817d' : '#368f78'}/>
        </mesh>
      })}/>
    </group>}
  </>
}

import MusicBloom from './MusicBloom'
import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Seed } from '../storage'
import type { Palette } from '../worlds/catalog'
import { growthValue } from '../worlds/growth'
import { worldGroundHeight } from '../worlds/terrain'
import { useDynamics, windPhase } from './dynamics'

/** Root-anchored growth works for procedural previews and static Lux3D exports alike.
 * It does not pretend a generated GLB has a rig or morph targets. */
export default function GrowingWish({ seed, palette, reduced, children, selected=false, onSelect }: { seed: Seed; palette: Palette; reduced: boolean; children?: ReactNode; selected?:boolean; onSelect?:(id:string)=>void }) {
  const root = useRef<THREE.Group>(null)
  const dynamics = useDynamics()
  const invalidate = useThree(state => state.invalidate)
  const progress = growthValue(seed.growth)
  const target = (.22 + progress * .78) * (seed.size ?? 1)
  const initialScale = useRef(target)
  const height = worldGroundHeight(seed.worldId, seed.x, seed.z)
  useEffect(() => { invalidate() }, [progress, seed.kind, seed.size, seed.rotation, seed.x, seed.z, selected, children, invalidate])
  useFrame((_, dt) => {
    if (!root.current) return
    const scale = reduced ? target : THREE.MathUtils.damp(root.current.scale.y, target, 5, Math.min(dt, .1))
    root.current.scale.set(scale, scale, scale)
    root.current.rotation.z = reduced ? 0 : windPhase(dynamics.current.time, seed.x, seed.z) * dynamics.current.wind * .4
  })
  return <group onClick={onSelect?event=>{if(event.delta<=5){event.stopPropagation();onSelect(seed.id)}}:undefined}><group ref={root} rotation={[0,seed.rotation??0,0]} position={[seed.x, height, seed.z]} scale={initialScale.current} userData={{ wishId: seed.id, kind: seed.kind || 'tree', growth: progress }}>
    {seed.music?.motif === 'foundation' && <group>
      {[[-.48,.18,.27],[.05,.28,.38],[.47,.14,.23]].map(([x,y,size],i) =>
        <mesh key={i} position={[x,y,.2 - i * .18]} rotation={[.12,i * 1.4,.1]} scale={[size * 1.7,size,size * 1.35]}>
          <dodecahedronGeometry args={[1,1]}/><meshStandardMaterial color={palette.earth} roughness={1}/>
        </mesh>)}
    </group>}
    {seed.music?.motif === 'canopy' && <group>
      {[[-.55,.24],[.55,-.15],[.05,.48]].map(([x,z],i) =>
        <group key={i} position={[x,0,z]} scale={.45 + i * .13}><MusicBloom seed={seed} palette={palette}/></group>)}
    </group>}
    {seed.music?.motif === 'foundation' || seed.music?.motif === 'canopy' ? null : children ? <group position={[-seed.x, -height, -seed.z]}>{children}</group> : seed.kind === 'mushroom' ? <>
      {[[-.3,.65,.1,.8],[.25,.95,0,1],[.1,.42,.4,.6]].map(([x,y,z,size],i) => <group key={i} position={[x,0,z]} scale={size}>
        <mesh position={[0,y/2,0]} castShadow><cylinderGeometry args={[.09,.15,y,9]}/><meshStandardMaterial color="#ddd4b5" roughness={.95}/></mesh>
        <mesh position={[0,y,0]} scale={[1,.45,1]} castShadow><sphereGeometry args={[.45,16,10,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color={palette.flowers[i%3]} roughness={.78}/></mesh>
        <mesh position={[0,y-.012,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.43,16]}/><meshStandardMaterial color="#d6cbb0" roughness={1} side={THREE.DoubleSide}/></mesh>
      </group>)}
    </> : seed.source === 'music' ? <MusicBloom seed={seed} palette={palette}/> : <>
      <mesh position={[0,.5,0]} castShadow><cylinderGeometry args={[.035,.055,1,7]}/><meshStandardMaterial color="#64835d" roughness={1}/></mesh>
      {[0,1].map(i=><mesh key={i} position={[i===0?-.13:.13,.3+i*.2,0]} rotation={[0,0,i===0?-.8:.8]} scale={[.11,.27,.045]}><sphereGeometry args={[1,10,6]}/><meshStandardMaterial color={palette.leaves[1]} roughness={1}/></mesh>)}
      <group position={[0,1,0]}>
        {Array.from({length:6},(_,i)=>{const angle=i*Math.PI/3;return <mesh key={i} position={[Math.cos(angle)*.24,.06,Math.sin(angle)*.24]} rotation={[0,-angle,0]} scale={[.32,.085,.15]} castShadow><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color={palette.flowers[i%3]} roughness={.65}/></mesh>})}
        <mesh position={[0,.13,0]} scale={[.13,.09,.13]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#e3c579" roughness={.8}/></mesh>
      </group>
    </>}
  </group>{selected && <mesh position={[seed.x,height+.04,seed.z]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.5,.55,48]}/><meshBasicMaterial color="#ead69c" transparent opacity={.85} depthWrite={false} side={THREE.DoubleSide}/></mesh>}</group>
}

import { moonV2Height } from '../worlds/moonTerrainV2'
import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, Color, DoubleSide, CircleGeometry } from 'three'
import { worldGroundHeight } from '../worlds/terrain'
import { TerrainMaterial } from './TerrainMaterial'
import type { CompiledWorld } from '../worlds/worldComposer'

const legacyGround=(x:number,z:number)=>worldGroundHeight('moon',x,z)
export function PreviewView({ result, view }: { result:CompiledWorld; view:number }) {
  const {camera,invalidate}=useThree()
  const ground=result.templateVersion==='moon-2'?moonV2Height:legacyGround
  useEffect(()=>{
    const position=camera.position.clone(), rotation=camera.quaternion.clone()
    const path=result.path
    if(view<0){
      camera.position.set(-2,36,0)
      camera.lookAt(-2,0,-2)
    } else {
      const index=path.nodes[view]
      const atMemory = view === path.nodes.length - 1
      const atOverlook = atMemory && result.memory.habitat === 'creek-overlook'
      const p=path.samples[atMemory ? index-(atOverlook ? 18 : 10) : index]
      const target=atMemory ? result.memory.center : path.samples[index+16] ?? result.memory.lookAt
      const eye = atMemory && result.memory.habitat === 'woodland-clearing'
        ? { x: target.x-2.4, z:target.z+2.2 } : p
      camera.position.set(eye.x,ground(eye.x,eye.z)+(atOverlook ? 1.72 : atMemory ? 2.05 : 1.52),eye.z+.28)
      if (atMemory) {
        const {lookAt, habitat} = result.memory
        const reach = habitat === 'creek-overlook' ? .29 : .48
        camera.lookAt(
          target.x + (lookAt.x - target.x) * reach,
          ground(target.x,target.z) + (habitat === 'creek-overlook' ? .86 : 1.25),
          target.z + (lookAt.z - target.z) * reach,
        )
      } else {
        camera.lookAt(target.x,ground(target.x,target.z)+1.28,target.z)
      }
    }
    invalidate()
    return ()=>{camera.position.copy(position);camera.quaternion.copy(rotation);invalidate()}
  },[camera,ground,invalidate,result,view])
  return null
}

export default function ComposedPreview({result, showStones = true, reveal = 1, memoryReveal = 1}:{result:CompiledWorld; showStones?:boolean; reveal?:number; memoryReveal?:number}) {
  const v2=result.templateVersion==='moon-2'
  const ground=v2?moonV2Height:legacyGround
  const geometry=useMemo(()=>{
    const positions:number[]=[], colors:number[]=[], indices:number[]=[]
    const points=result.path.samples
    const shade=new Color()
    for(let i=0;i<points.length;i++){
      const p=points[i], a=points[Math.max(0,i-1)], b=points[Math.min(points.length-1,i+1)]
      const len=Math.hypot(b.z-a.z,b.x-a.x)
      for(let lane=0;lane<7;lane++){
        const u=(lane-3)/3
        const width=p.width*(1+.11*Math.sin(i*.27+lane))
        const x=p.x+(b.z-a.z)/len*u*width,z=p.z-(b.x-a.x)/len*u*width
        positions.push(x,ground(x,z)+.035,z)
        shade.set('#857963').multiplyScalar(.93+.11*Math.sin(i*.72+lane*1.9))
        colors.push(shade.r,shade.g,shade.b,(1-Math.abs(u)**1.5)*.86*Math.min(1,(points.length-1-i)/9))
        if(i && lane){const j=i*7+lane;indices.push(j-8,j-7,j,j-8,j,j-1)}
      }
    }
    const mesh=new BufferGeometry()
    mesh.setAttribute('position',new Float32BufferAttribute(positions,3))
    mesh.setAttribute('color',new Float32BufferAttribute(colors,4))
    mesh.setIndex(indices)
    mesh.computeVertexNormals()
    return mesh
  },[ground,result])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useEffect(()=>{
    if (!v2) return
    const colors=geometry.attributes.color
    const length=result.path.samples.length
    for(let i=0;i<length;i++){
      const front=i/(length-1)
      const feather=Math.max(0,Math.min(1,(reveal-front)*15))
      const guide=1+.25*Math.max(0,1-Math.abs(front-reveal+.085)*10)*(reveal<.99?1:0)
      for(let lane=0;lane<7;lane++){
        const u=(lane-3)/3
        colors.setW(i*7+lane,(1-Math.abs(u)**1.5)*.86*Math.min(1,(length-1-i)/9)*feather*guide)
      }
    }
    colors.needsUpdate=true
  },[geometry,result.path.samples,reveal,v2])
  const {x,z}=result.memory.center
  const overlook = result.memory.habitat === 'creek-overlook'
  const focalStone = overlook ? result.placements.reduce<(typeof result.placements)[number] | undefined>(
    (focal, stone) => !focal || stone.z < focal.z ? stone : focal, undefined,
  ) : undefined
  const clearing = useMemo(() => {
    const surface = new CircleGeometry(result.memory.radius, 48)
    surface.rotateX(-Math.PI/2)
    const position = surface.attributes.position
    const colors: number[] = []
    const shade = new Color(result.memory.habitat === 'creek-overlook' ? '#756f58' : '#89806b')
    for (let i=0;i<position.count;i++) {
      const angle = Math.atan2(position.getZ(i), position.getX(i))
      const edge = 1 + .11 * Math.sin(3 * angle) + .07 * Math.cos(5 * angle)
      const wx=x+position.getX(i)*edge, wz=z+position.getZ(i)*edge
      position.setXYZ(i,wx,ground(wx,wz)+.052,wz)
      colors.push(shade.r,shade.g,shade.b,i===0 ? (overlook ? .84 : .64) : 0)
    }
    surface.setAttribute('color',new Float32BufferAttribute(colors,4))
    surface.computeVertexNormals()
    return surface
  },[ground,result.memory,x,z,overlook])
  useEffect(()=>()=>clearing.dispose(),[clearing])
  return <group name="composed-world">
    <mesh geometry={clearing} renderOrder={2} visible={memoryReveal>0}><meshStandardMaterial opacity={memoryReveal} vertexColors transparent depthWrite={false} side={DoubleSide} roughness={1} emissive={result.memory.habitat === 'creek-overlook' ? "#344650" : "#6f6552"} emissiveIntensity={(overlook ? .39 : .18)+result.dream*.0018}/></mesh>
    <mesh geometry={geometry} renderOrder={1}><TerrainMaterial moon={!v2} overlay/></mesh>
    {showStones && result.placements.map(stone=>{
      const focal = stone === focalStone
      return <mesh key={stone.id} position={[stone.x,ground(stone.x,stone.z)+stone.size*.1,stone.z]}
      scale={[stone.size,stone.size*(focal ? .91 : .5),stone.size*.8]} rotation={[.1,stone.x,.12]}>
      <dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color={focal ? "#7c8b7c" : "#586052"} roughness={focal ? .77 : .94} emissive={focal ? "#384756" : "#000000"} emissiveIntensity={.42} flatShading/>
    </mesh>})}
  </group>
}

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { WorldId } from '../storage'
import { PLACEMENT_RADIUS } from '../worlds/transforms'
import { worldGroundHeight } from '../worlds/terrain'

export default function PlacementSurface({ worldId, onPlace }: {worldId:WorldId;onPlace?:(x:number,z:number)=>void}) {
  const geometry=useMemo(()=>{
    const mesh=new THREE.PlaneGeometry(PLACEMENT_RADIUS*2,PLACEMENT_RADIUS*2,32,32);mesh.rotateX(-Math.PI/2)
    const position=mesh.getAttribute('position')
    for(let i=0;i<position.count;i++)position.setY(i,worldGroundHeight(worldId,position.getX(i),position.getZ(i))+.035)
    const source=mesh.getIndex()!,indices:number[]=[]
    for(let i=0;i<source.count;i+=3) {
      const triangle=[source.getX(i),source.getX(i+1),source.getX(i+2)]
      if(triangle.every(v=>Math.hypot(position.getX(v),position.getZ(v))<=PLACEMENT_RADIUS))indices.push(...triangle)
    }
    mesh.setIndex(indices);mesh.computeVertexNormals();return mesh
  },[worldId])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} renderOrder={3} onClick={event=>{
    if(event.delta>5)return
    event.stopPropagation();onPlace?.(event.point.x,event.point.z)
  }}><meshBasicMaterial color="#f2dfab" transparent opacity={.16} depthWrite={false} side={THREE.DoubleSide}/></mesh>
}

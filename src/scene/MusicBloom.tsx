import {useLayoutEffect,useRef} from 'react'
import {useThree} from '@react-three/fiber'
import * as THREE from 'three'
import type {Seed} from '../storage'
import type {Palette} from '../worlds/catalog'
import {worldGroundHeight} from '../worlds/terrain'
import {growthValue} from '../worlds/growth'

/** Seven flowers, four draw calls; geometry stays rooted as the cluster expands. */
export default function MusicBloom({seed,palette}:{seed:Seed;palette:Palette}) {
 const stems=useRef<THREE.InstancedMesh>(null),petals=useRef<THREE.InstancedMesh>(null),centers=useRef<THREE.InstancedMesh>(null),leaves=useRef<THREE.InstancedMesh>(null)
 const invalidate=useThree(s=>s.invalidate)
 useLayoutEffect(()=>{
  if(!stems.current||!petals.current||!centers.current||!leaves.current)return
  const d=new THREE.Object3D(),g=growthValue(seed.growth),scale=(.22+g*.78)*(seed.size??1),rotation=seed.rotation??0
  const ground=worldGroundHeight(seed.worldId,seed.x,seed.z)
  for(let i=0;i<7;i++) {
   const angle=i*2.39996,r=i===0?0:.25+(i%3)*.1,x=Math.cos(angle)*r,z=Math.sin(angle)*r,h=.65+(i%3)*.15
   const wx=seed.x+(Math.cos(rotation)*x+Math.sin(rotation)*z)*scale,wz=seed.z+(-Math.sin(rotation)*x+Math.cos(rotation)*z)*scale
   const y=(worldGroundHeight(seed.worldId,wx,wz)-ground)/scale
   d.rotation.set(0,0,0);d.position.set(x,y+h/2,z);d.scale.set(1,h,1);d.updateMatrix();stems.current.setMatrixAt(i,d.matrix)
   d.position.set(x,y+h+.06,z);d.scale.set(.075,.05,.075);d.updateMatrix();centers.current.setMatrixAt(i,d.matrix)
   const open=.3+g*.7
   for(let j=0;j<6;j++) {
    const a=j*Math.PI/3
    d.position.set(x+Math.cos(a)*.13*open,y+h+.08*(1-open),z+Math.sin(a)*.13*open)
    d.rotation.set(0,-a,0);d.scale.set(.18,.045+.07*(1-open),.08);d.updateMatrix();petals.current.setMatrixAt(i*6+j,d.matrix)
    petals.current.setColorAt(i*6+j,new THREE.Color(palette.flowers[(i+j)%3]))
   }
   for(let j=0;j<2;j++) {d.position.set(x+(j?-.05:.05),y+h*.4,z);d.rotation.set(0,angle,j?-.7:.7);d.scale.set(.055,.16,.025);d.updateMatrix();leaves.current.setMatrixAt(i*2+j,d.matrix)}
  }
  for(const mesh of [stems.current,petals.current,centers.current,leaves.current]) {mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere()}
  invalidate()
 },[seed.x,seed.z,seed.worldId,seed.size,seed.rotation,seed.growth,palette,invalidate])
 return <group name="music-flower-cluster">
  <instancedMesh ref={stems} args={[undefined,undefined,7]}><cylinderGeometry args={[.02,.03,1,5]}/><meshStandardMaterial color={palette.leaves[1]} roughness={1}/></instancedMesh>
  <instancedMesh ref={petals} args={[undefined,undefined,42]}><sphereGeometry args={[1,8,5]}/><meshStandardMaterial roughness={.8}/></instancedMesh>
  <instancedMesh ref={centers} args={[undefined,undefined,7]}><sphereGeometry args={[1,8,5]}/><meshStandardMaterial color="#dfca87" roughness={.9}/></instancedMesh>
  <instancedMesh ref={leaves} args={[undefined,undefined,14]}><sphereGeometry args={[1,6,4]}/><meshStandardMaterial color={palette.leaves[1]} roughness={1}/></instancedMesh>
 </group>
}

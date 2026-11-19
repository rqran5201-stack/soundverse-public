import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import treeUrl from '../assets/models/starlight-tree.glb'
import { groundHeight } from '../dreamscape'
import { useDynamics, windPhase } from './dynamics'
import { useCuratedAsset, type CuratedStatus } from './useCuratedAsset'

export default function CuratedTree({ x, z, scale = 1, fallback, onStatus }: {
  x: number; z: number; scale?: number; fallback: ReactNode; onStatus: (status: CuratedStatus) => void
}) {
  const { asset, status } = useCuratedAsset(treeUrl, '星光树 · Lux3D task 4830722')
  const group = useRef<THREE.Group>(null), dynamics = useDynamics()
  useEffect(() => onStatus(status), [status, onStatus])
  useFrame(() => { if (group.current) group.current.rotation.z = windPhase(dynamics.current.time, x, z) * dynamics.current.wind * .55 })
  if (!asset) return <>{fallback}</>
  return <group ref={group} position={[x, groundHeight(x, z), z]} scale={asset.scale * scale} dispose={null} name="lux3d-curated-tree">
    <group position={asset.offset}><primitive object={asset.scene} /></group>
  </group>
}

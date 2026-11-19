import type { LuxAsset } from '../luxAsset'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import mushroomUrl from '../assets/models/moon-mushrooms.glb'
import { worldGroundHeight } from '../worlds/terrain'
import { useDynamics } from './dynamics'
import { useCuratedAsset, type CuratedStatus } from './useCuratedAsset'

export type FeaturedStatus = CuratedStatus
export default function FeaturedMushroom({ onStatus, onAsset }: { onStatus: (status: FeaturedStatus) => void; onAsset?: (asset:LuxAsset|null)=>void }) {
  const { asset, status } = useCuratedAsset(mushroomUrl, '月光蘑菇簇 · Lux3D task 4893490')
  const group = useRef<THREE.Group>(null), dynamics = useDynamics()
  useEffect(() => {onStatus(status);onAsset?.(asset)}, [status, asset, onStatus, onAsset])
  useFrame(() => { if (group.current) group.current.rotation.z = Math.sin(dynamics.current.time * .6) * dynamics.current.wind * .2 })
  if (!asset) return null
  return <group ref={group} position={[-1.9, worldGroundHeight('moon', -1.9, 2.5), 2.5]} scale={asset.scale * .55} dispose={null} name="lux3d-featured-mushrooms">
    <group position={asset.offset}><primitive object={asset.scene} /></group>
  </group>
}

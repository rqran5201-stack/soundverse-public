import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import treeUrl from '../assets/models/moon-ancient-tree.glb'
import type { LuxAsset } from '../luxAsset'
import { worldGroundHeight } from '../worlds/terrain'
import { useDynamics, windPhase } from './dynamics'
import { useCuratedAsset, type CuratedStatus } from './useCuratedAsset'

/** One uploaded static mesh; a root-level sway does not imply branch rigging. */
export default function AncientMoonTree({ onStatus, onAsset }: {
  onStatus: (status: CuratedStatus) => void; onAsset: (asset: LuxAsset | null) => void
}) {
  const { asset, status } = useCuratedAsset(treeUrl, '月光古树 · 用户 Aholo 工作流导出')
  const root = useRef<THREE.Group>(null), dynamics = useDynamics()
  useEffect(() => { onStatus(status); onAsset(asset) }, [asset, status, onStatus, onAsset])
  useFrame(() => {
    if (root.current) root.current.rotation.z = windPhase(dynamics.current.time, 0, -2.2) * dynamics.current.wind * .3
  })
  if (!asset) return null // The existing forest remains usable during loading/failure.
  return <group position={[0, worldGroundHeight('moon', 0, -2.2), -2.2]} rotation={[0, .6, 0]}>
    <group ref={root} scale={asset.scale * 2.4} dispose={null} name="lux3d-user-ancient-tree">
      <group position={asset.offset}><primitive object={asset.scene} /></group>
    </group>
  </group>
}

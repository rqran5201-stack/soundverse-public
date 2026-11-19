import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDynamics } from './dynamics'

function Bird({ index, geometry }: { index: number; geometry: THREE.BufferGeometry }) {
  const body = useRef<THREE.Group>(null)
  const left = useRef<THREE.Group>(null), right = useRef<THREE.Group>(null)
  const dynamics = useDynamics()
  useFrame(() => {
    const time = dynamics.current.time, path = time * .035 + index * .33
    if (body.current) {
      body.current.position.set(Math.sin(path) * 25 - 3, 8 + Math.sin(time * .18 + index) * .65 + index * .45, -24 - Math.cos(path) * 10 - index * 3)
      body.current.rotation.y = Math.atan2(Math.cos(path) * 25, Math.sin(path) * 10)
    }
    const flap = Math.sin(time * 3.8 + index) * .4 * Math.max(0, Math.sin(time * .4 + index))
    if (left.current) left.current.rotation.z = flap
    if (right.current) right.current.rotation.z = -flap
  })
  return <group ref={body} scale={.65} name="hero-bird">
    <mesh scale={[.08, .08, .26]}><sphereGeometry args={[1, 6, 4]} /><meshBasicMaterial color="#75867d" /></mesh>
    <group ref={left}><mesh scale={[-1, 1, 1]}><primitive object={geometry} attach="geometry" /><meshBasicMaterial color="#75867d" side={THREE.DoubleSide} /></mesh></group>
    <group ref={right}><mesh><primitive object={geometry} attach="geometry" /><meshBasicMaterial color="#75867d" side={THREE.DoubleSide} /></mesh></group>
  </group>
}
export default function DistantBirds({ low = false }: { low?: boolean }) {
  const geometry = useMemo(() => {
    const mesh = new THREE.BufferGeometry()
    mesh.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, .7, .03, .08, .24, 0, -.18], 3))
    mesh.computeVertexNormals(); return mesh
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group>{Array.from({ length: low ? 2 : 4 }, (_, i) => <Bird index={i} geometry={geometry} key={i} />)}</group>
}

import DistantTerrain from './DistantTerrain'
import { TerrainMaterial } from './TerrainMaterial'
import MoonForestAssets, { MeadowGrass, MoonShrubs } from './MoonForestAssets'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { random } from '../dreamscape'
import { fieldPathX, moonCreekX, worldGroundHeight } from '../worlds/terrain'
import { Water } from './Nature'
import { MeadowTree, WindVegetation } from './WindVegetation'
import DistantBirds from './DistantBirds'
import { useDynamics } from './dynamics'

const moonGround = (x: number, z: number) => worldGroundHeight('moon', x, z)
const fieldGround = (x: number, z: number) => worldGroundHeight('field', x, z)

function Land({ moon }: { moon: boolean }) {
  const geometry = useMemo(() => {
    const mesh = new THREE.PlaneGeometry(64, 64, 144, 144)
    mesh.rotateX(-Math.PI / 2)
    const positions = mesh.getAttribute('position'), colors = []
    const soil = new THREE.Color(moon ? '#514a3b' : '#a39468')
    const cover = new THREE.Color(moon ? '#455342' : '#6d984b')
    const wet = new THREE.Color(moon ? '#303b37' : '#857c61')
    const color = new THREE.Color()
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i), h = (moon ? moonGround : fieldGround)(x, z)
      positions.setY(i, h)
      const variation = (moon ? .5 : .76) + .24 * Math.sin(x * .48 + z * .31) + .14 * Math.cos(z * .84 - x * .6)
      color.copy(soil).lerp(cover, variation)
      if (moon) {
        const bankDistance = Math.abs(x - moonCreekX(z))
        const brokenEdge = .36 * Math.sin(z * 1.15 + x * 2.2) + .18 * Math.cos(z * 2.7)
        const bank = 1 - THREE.MathUtils.smoothstep(bankDistance + brokenEdge, .95, 2.65)
        color.lerp(wet, bank * .85)
      } else {
        const path = Math.abs(x - fieldPathX(z)) + .13 * Math.sin(z * 1.6)
        color.lerp(soil, (1 - THREE.MathUtils.smoothstep(path, .3, .92)) * .92)
        color.lerp(wet, 1 - THREE.MathUtils.smoothstep(h, -.1, .3))
      }
      color.multiplyScalar(.94 + .06 * Math.sin(x * 2.5 + z * 1.7))
      colors.push(color.r, color.g, color.b)
    }
    mesh.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); mesh.computeVertexNormals()
    return mesh
  }, [moon])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh receiveShadow><primitive object={geometry} attach="geometry" /><TerrainMaterial moon={moon} /></mesh>
}

function ForestGrove({ low }: { low: boolean }) {
  const trunks = useRef<THREE.InstancedMesh>(null), crowns = useRef<THREE.InstancedMesh>(null), branches = useRef<THREE.InstancedMesh>(null)
  const group = useRef<THREE.Group>(null)
  const invalidate = useThree(s => s.invalidate), dynamics = useDynamics()
  const count = low ? 15 : 25
  const leavesPerTree = low ? 20 : 30
  useEffect(() => {
    if (!trunks.current || !crowns.current || !branches.current) return
    const d = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996, radius = 10 + random(i, 71) * 10
      let x = Math.cos(angle) * radius; const z = Math.sin(angle) * radius - 4
      if (moonGround(x, z) < 0) x -= 3
      if (z > 0 && x > 0) x += 7
      const y = moonGround(x, z), height = 6 + random(i, 72) * 4.5
      d.position.set(x, y + height / 2, z); d.rotation.set(0, angle, (random(i, 73) - .5) * .08)
      d.scale.set(1.1 + random(i, 74), height, 1.1 + random(i, 74)); d.updateMatrix(); trunks.current.setMatrixAt(i, d.matrix)
      for (let j = 0; j < 3; j++) {
        const direction = angle + j * 2.09
        const from = new THREE.Vector3(x, y + height * .67, z)
        const to = new THREE.Vector3(x + Math.cos(direction) * 1.8, y + height * .95, z + Math.sin(direction) * 1.8)
        const v = to.clone().sub(from)
        d.position.copy(from.add(to).multiplyScalar(.5)); d.quaternion.setFromUnitVectors(up, v.clone().normalize())
        d.scale.set(.45, v.length(), .45); d.updateMatrix(); branches.current.setMatrixAt(i * 3 + j, d.matrix)
      }
      for (let j = 0; j < leavesPerTree; j++) {
        const a = j * 2.39996, spread = Math.sqrt(random(i * 31 + j, 91)) * 2.5
        d.position.set(x + Math.cos(a) * spread, y + height + (1 - spread / 2.5) * 1.2, z + Math.sin(a) * spread)
        d.rotation.set(0, a, .2); d.scale.set(1.05, .65, .9); d.updateMatrix(); crowns.current.setMatrixAt(i * leavesPerTree + j, d.matrix)
        crowns.current.setColorAt(i * leavesPerTree + j, new THREE.Color(['#4a7569', '#668b78', '#527b6c'][j % 3]))
      }
    }
    for (const mesh of [trunks.current, branches.current, crowns.current]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    }
    invalidate()
  }, [count, leavesPerTree, invalidate])
  useFrame(() => { if (group.current) group.current.rotation.z = Math.sin(dynamics.current.time * .32) * dynamics.current.wind * .08 })
  return <group ref={group} name="moon-forest-grove">
    <instancedMesh ref={trunks} args={[undefined, undefined, count]} castShadow><cylinderGeometry args={[.14, .32, 1, 7, 3]} /><meshStandardMaterial color="#50685b" roughness={1} /></instancedMesh>
    <instancedMesh ref={branches} args={[undefined, undefined, count * 3]}><cylinderGeometry args={[.1, .19, 1, 6]} /><meshStandardMaterial color="#50685b" roughness={1} /></instancedMesh>
    <instancedMesh ref={crowns} args={[undefined, undefined, count * leavesPerTree]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial roughness={1} /></instancedMesh>
  </group>
}

function Mushrooms() {
  const caps = useRef<THREE.InstancedMesh>(null), stems = useRef<THREE.InstancedMesh>(null), gills = useRef<THREE.InstancedMesh>(null)
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const invalidate = useThree(s => s.invalidate), dynamics = useDynamics()
  useEffect(() => {
    if (!caps.current || !stems.current || !gills.current) return
    const d = new THREE.Object3D()
    for (let i = 0; i < 21; i++) {
      const center = [[-3.3, 3.4], [3.2, 2.6], [5.2, -3], [-4, -4]][i % 4]
      const x = center[0] + (random(i, 80) - .5) * 1.3, z = center[1] + (random(i, 81) - .5) * 1.3
      const y = moonGround(x, z), height = .45 + random(i, 82) * .9
      d.rotation.set(0, 0, 0); d.position.set(x, y + height / 2, z); d.scale.set(1, height, 1); d.updateMatrix(); stems.current.setMatrixAt(i, d.matrix)
      d.position.set(x, y + height, z); d.scale.set(height * .48, height * .23, height * .48); d.updateMatrix(); caps.current.setMatrixAt(i, d.matrix)
      caps.current.setColorAt(i, new THREE.Color(['#8e96ac', '#c3b3a3', '#8ba6a2'][i % 3]))
      d.scale.set(height * .48, .012, height * .48); d.updateMatrix(); gills.current.setMatrixAt(i, d.matrix)
    }
    for (const m of [caps.current, stems.current, gills.current]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere() }
    invalidate()
  }, [invalidate])
  useFrame(() => { if (material.current) material.current.emissiveIntensity = .22 + dynamics.current.tide * .18 + Math.sin(dynamics.current.time * .55) * .03 })
  return <group name="moon-placeholder-mushrooms">
    <instancedMesh ref={stems} args={[undefined, undefined, 21]}><cylinderGeometry args={[.035, .065, 1, 7]} /><meshStandardMaterial color="#c9c7a7" roughness={.9} /></instancedMesh>
    <instancedMesh ref={caps} args={[undefined, undefined, 21]}><sphereGeometry args={[1, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial roughness={.85} /></instancedMesh>
    <instancedMesh ref={gills} args={[undefined, undefined, 21]}><cylinderGeometry args={[1, 1, 1, 12]} /><meshStandardMaterial ref={material} color="#e5d4a8" emissive="#d4c392" emissiveIntensity={.22} /></instancedMesh>
  </group>
}

function WoodlandLights() {
  const group = useRef<THREE.Group>(null), dynamics = useDynamics()
  useFrame(() => {
    if (!group.current) return
    group.current.position.y = Math.sin(dynamics.current.time * .2) * .15 + dynamics.current.shimmer * .25
    group.current.rotation.y = dynamics.current.time * .012
  })
  return <group ref={group}><Sparkles count={9} position={[1, 1.3, -7]} scale={[9, 2.1, 10]} speed={0} size={1.3} color="#f1df9b" /></group>
}

const meadowCloudPuffs = [
  [-13, 0, 0, 9, 1.6, 3],
  [-6, .6, 0, 8.5, 2.2, 3.8],
  [1, 1.2, 0, 7, 3.1, 4],
  [7, .4, 0, 8, 2.1, 3.5],
  [14, -.5, 0, 6.5, 1.1, 2.8],
] as const

function MeadowClouds() {
  const clouds = useRef<THREE.Group>(null)
  const dynamics = useDynamics()
  useFrame(() => { if (clouds.current) clouds.current.position.x = 11 + Math.sin(dynamics.current.time * .07) * 3 })
  return <group ref={clouds} position={[11, 10, -64]}>
    {meadowCloudPuffs.map(([x, y, z, sx, sy, sz]) =>
      <mesh key={x} position={[x,y,z]} scale={[sx,sy,sz]}>
        <sphereGeometry args={[1, 20, 12]}/>
        <meshStandardMaterial color="#f6f5e9" roughness={1}/>
      </mesh>
    )}
    <mesh position={[-33, 1.6, -21]} scale={[16, 1.2, 3.5]}>
      <sphereGeometry args={[1, 20, 12]}/>
      <meshBasicMaterial color="#e7edef" />
    </mesh>
  </group>
}

export default function SongLandscape({ worldId, low }: { worldId: 'moon' | 'field'; low: boolean }) {
  const moon = worldId === 'moon'
  return <>
    <color attach="background" args={[moon ? '#30424c' : '#acd3e8']} />
    <fog attach="fog" args={[moon ? '#30424c' : '#c7dde5', moon ? 12 : 25, moon ? 62 : 105]} />
    <hemisphereLight args={[moon ? '#b9cad5' : '#f0f7e5', moon ? '#54665c' : '#a6b584', moon ? 1.37 : 2.15]} />
    <directionalLight position={moon ? [-10, 15, -18] : [-12, 15, 5]} color={moon ? '#d3e7f5' : '#ffe4ad'} intensity={moon ? 2.55 : 2.1} castShadow={!low}
      shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-bias={-.0005} />
    {!moon && <directionalLight position={[8, 7, 13]} color="#e7f0db" intensity={.68} />}
    <Land moon={moon} />
    <DistantTerrain world={worldId} />
    <Water creek={moon} color={moon ? '#415f6f' : '#70b6b5'} sky={moon ? '#30424c' : '#c7dde5'} shoreCenter={[1000, 1000]} />
    {moon ? <>
      <directionalLight position={[8, 9, 12]} color="#9db2af" intensity={.38} />
      <MoonForestAssets low={low} treeFallback={<><ForestGrove low={low} /><Mushrooms /></>} plantFallback={<WindVegetation origin={[-5, -4]} ground={moonGround} low={low} />} /><MoonShrubs /><WoodlandLights />
      {([[-6,-10], [-9,3], [12,-8], [13,5], [-11,-16], [13,-15], [-1,-13]] as [number, number][]).map(origin =>
        <WindVegetation key={origin.join(',')} origin={origin} ground={moonGround} low woodland/>
      )}
      <mesh position={[-16, 17, -37]}><sphereGeometry args={[.78, 20, 14]} /><meshBasicMaterial color="#e5edf1" fog={false} /></mesh>
    </> : <>
      {([[-4, -3], [-8, 3], [1, 6], [-5, 10], [3, -7], [-10, -9], [-4,-13], [-9,-18], [2,-16], [-10,9], [-14,0], [-15,-9], [-4,-22], [-10,-24], [-17,-17], [-17,7]] as [number, number][]).map((origin, i) => <WindVegetation key={i} origin={origin} ground={fieldGround} meadowPath={fieldPathX} low={low} />)}
      <MeadowGrass /><MoonForestAssets world="field" low={low} treeFallback={<MeadowTree x={-6} z={-9} ground={fieldGround} scale={1.5} low={low} />} />
      <DistantBirds low={low} />
      <MeadowClouds />
    </>}
  </>
}

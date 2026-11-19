import { useLayoutEffect, useMemo, useRef } from 'react'
import { Sparkles } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { WORLD_PALETTES } from '../worlds/catalog'
import { Island, Tree, Water } from './Nature'
import { MeadowTree, WindVegetation } from './WindVegetation'
import CuratedTree from './CuratedTree'
import type { CuratedStatus } from './useCuratedAsset'
import DistantBirds from './DistantBirds'
import { useDynamics } from './dynamics'

const palette = WORLD_PALETTES.sea

function HorizonCamera({ reduced }: { reduced: boolean }) {
  const { camera, size } = useThree()
  const mobile = size.width / size.height < 1
  const origin = useMemo(() => new THREE.Vector3(mobile ? 4.8 : 0, mobile ? 4.6 : 3.8, mobile ? 26 : 20), [mobile])
  const target = useMemo(() => new THREE.Vector3(mobile ? 4.8 : 0, 3.4, -18), [mobile])
  useLayoutEffect(() => {
    camera.position.copy(origin)
    if (camera instanceof THREE.PerspectiveCamera) { camera.fov = mobile ? 52 : 48; camera.updateProjectionMatrix() }
    camera.lookAt(target)
  }, [camera, origin, target, mobile])
  useFrame(({ pointer }, delta) => {
    const x = reduced ? origin.x : origin.x + pointer.x * .14
    const y = reduced ? origin.y : origin.y + pointer.y * .06
    camera.position.x = THREE.MathUtils.damp(camera.position.x, x, 2, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, y, 2, delta)
    camera.lookAt(target)
  })
  return null
}

function DreamSky() {
  return <mesh scale={350} renderOrder={-10}>
    <sphereGeometry args={[1, 24, 16]} />
    <shaderMaterial side={THREE.BackSide} depthWrite={false} vertexShader={`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
      fragmentShader={`varying vec3 direction;void main(){vec3 d=normalize(direction);float h=max(0.,d.y);vec3 c=mix(vec3(.70,.83,.75),vec3(.19,.48,.57),pow(h,.55));float sun=max(0.,dot(d,normalize(vec3(-.6,.42,-1.))));c+=vec3(.11,.075,.025)*pow(sun,12.);c=mix(c,vec3(1.,.95,.78),smoothstep(.9993,.9997,sun));gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`} />
  </mesh>
}

function FarRidges() {
  const geometry = useMemo(() => {
    const vertices: number[] = [], indices: number[] = []
    for (let i = 0; i <= 50; i++) {
      const x = -125 + i * 5
      const y = 2 + 9 * Math.pow(.5 + .5 * Math.sin(i * .43), 2) + 4 * Math.sin(i * .91) ** 2
      vertices.push(x, -9, 0, x, y, 0)
      if (i < 50) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    }
    const mesh = new THREE.BufferGeometry()
    mesh.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); mesh.setIndex(indices); mesh.computeVertexNormals()
    return mesh
  }, [])
  // This geometry is shared by three meshes and disposed once on unmount.
  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  return <group>
    {[[-18, -1, -130, '#b2cecb'], [10, -2, -105, '#9ebcb8'], [30, -2, -78, '#8caaa1']].map(([x, y, z, color], i) =>
      <mesh key={i} position={[Number(x), Number(y), Number(z)]} scale={[1, 1 - i * .12, 1]}><primitive attach="geometry" object={geometry} /><meshBasicMaterial color={String(color)} side={THREE.DoubleSide} /></mesh>)}
  </group>
}

function CloudSea({ low }: { low: boolean }) {
  const group = useRef<THREE.Group>(null)
  const dynamics = useDynamics()
  useFrame(() => {
    if (group.current) group.current.position.x = Math.sin(dynamics.current.time * .023) * 3
  })
  return <group ref={group} name="hero-clouds">
    {Array.from({ length: low ? 6 : 10 }, (_, i) => {
      const x = (i % 5 - 2) * 28, z = -54 - Math.floor(i / 5) * 35
      return <group key={i} position={[x, 1 + (i % 3) * .8, z]}>
        {[[-5, -.4, 0], [0, .2, 1], [5, -.1, -.5]].map(([a, b, c], j) => <mesh key={j} position={[a, b, c]} scale={[7 + j, 1.4 + j * .15, 3]}>
          <sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial color="#f5f2de" transparent opacity={.32} depthWrite={false} />
        </mesh>)}
      </group>
    })}
    {[[-18, 14, -55], [27, 19, -74], [4, 25, -100]].map(([x, y, z], i) => <mesh key={i} position={[x, y, z]} scale={[10, .8, 2.8]}>
      <sphereGeometry args={[1, 16, 8]} /><meshBasicMaterial color="#fff8e7" transparent opacity={.32} depthWrite={false} />
    </mesh>)}
  </group>
}

function FloatingIsland({ position, scale }: { position: [number, number, number]; scale: number }) {
  return <group position={position} scale={scale}>
    <Island palette={palette} />
    <mesh position={[0, -2.5, 0]}><cylinderGeometry args={[4.5, .65, 5.4, 9, 2]} /><meshStandardMaterial color="#829389" roughness={1} flatShading /></mesh>
    <Tree x={-1.4} z={-.7} scale={1.1} energy={0} motion palette={palette} />
    <Tree x={1.8} z={.6} scale={.7} energy={0} motion palette={palette} />
  </group>
}

export default function HeroLandscape({ reduced, low, onTreeStatus }: { reduced: boolean; low: boolean; onTreeStatus: (status: CuratedStatus) => void }) {
  return <>
    <HorizonCamera reduced={reduced} /><DreamSky />
    <fog attach="fog" args={['#dce8dd', 35, 160]} />
    <hemisphereLight args={['#e4f1e8', '#8d9a72', 1.7]} />
    <directionalLight position={[-15, 22, 12]} color="#fff0ca" intensity={2.1} castShadow={!low}
      shadow-mapSize={[1024, 1024]} shadow-camera-left={-17} shadow-camera-right={17} shadow-camera-top={15} shadow-camera-bottom={-15} shadow-bias={-.0005} />
    <Water color="#68b8b5" sky="#dce8dd" shoreCenter={[7, -7]} shoreScale={[1.4, 1.25]} energy={0} motion={!reduced} />
    <FarRidges /><CloudSea low={low} />
    <group position={[7, -.15, -7]} scale={[1.4, 1.3, 1.25]} name="hero-main-island">
      <Island palette={palette} />
      <CuratedTree x={-.9} z={-.8} scale={1.55} onStatus={onTreeStatus} fallback={<MeadowTree low={low} x={-.9} z={-.8} scale={1.25} />} />
      <MeadowTree low={low} x={2.5} z={.3} scale={.7} />
      <MeadowTree low={low} x={-2.8} z={.2} scale={.62} />
      <WindVegetation low={low} />
    </group>
    <DistantBirds low={low} /><HeroPollen low={low} />
    <FloatingIsland position={[-8, 6, -43]} scale={.8} />
    <FloatingIsland position={[24, 10, -62]} scale={1.2} />
    <FloatingIsland position={[5, 7, -83]} scale={.55} />
    <group position={[-7, -.35, 12]} scale={[2, .9, 1.7]} name="hero-foreground">
      <Island palette={palette} /><WindVegetation near low={low} />
    </group>
  </>
}

function HeroPollen({ low }: { low: boolean }) {
  const group = useRef<THREE.Group>(null)
  const dynamics = useDynamics()
  useFrame(() => {
    if (!group.current) return
    group.current.rotation.y = dynamics.current.time * .025
    group.current.position.y = dynamics.current.shimmer * .3 + dynamics.current.pulse * .1
  })
  return <group ref={group}><Sparkles position={[5, 2, -3]} count={low ? 12 : 26} scale={[20, 5, 18]} size={1.5} speed={0} color="#fff2c9" /></group>
}

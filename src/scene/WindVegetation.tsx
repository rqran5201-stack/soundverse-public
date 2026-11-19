import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { groundHeight, random } from '../dreamscape'
import { useDynamics, windPhase } from './dynamics'

/** Geometry bends in the vertex shader; roots stay planted, instance matrices stay static. */
function useWindMaterial() {
  const dynamics = useDynamics()
  const values = useMemo(() => ({ windTime: { value: 0 }, windStrength: { value: 0 } }), [])
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .93 })
    mat.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, values)
      shader.vertexShader = `uniform float windTime;uniform float windStrength;\n${shader.vertexShader}`
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 anchor=vec3(0.);
        #ifdef USE_INSTANCING
          anchor=instanceMatrix[3].xyz;
        #endif
        float phase=sin(windTime*.65-anchor.x*.15-anchor.z*.12)+.3*sin(windTime*1.1+anchor.z*.3);
        float tip=max(0.,position.y);
        transformed.x+=phase*windStrength*tip*tip;
        transformed.z+=cos(windTime*.47+anchor.x*.24)*windStrength*tip*tip*.3;`)
    }
    mat.customProgramCacheKey = () => 'soundverse-rooted-wind-v1'
    return mat
  }, [values])
  useFrame(() => { values.windTime.value = dynamics.current.time; values.windStrength.value = dynamics.current.wind * 4 })
  useEffect(() => () => material.dispose(), [material])
  return material
}

function bladeGeometry() {
  const mesh = new THREE.BufferGeometry()
  mesh.setAttribute('position', new THREE.Float32BufferAttribute([-.02, 0, 0, .02, 0, 0, -.012, .5, .025, .012, .5, .025, 0, 1, .06], 3))
  mesh.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]); mesh.computeVertexNormals()
  return mesh
}
function blossomGeometry() {
  const parts: THREE.BufferGeometry[] = []
  for (let j = 0; j < 5; j++) {
    const angle = j * Math.PI * 2 / 5
    const petal = new THREE.SphereGeometry(1, 6, 4)
    petal.scale(.085, .025, .06); petal.rotateY(-angle)
    petal.translate(Math.cos(angle) * .075, .57, Math.sin(angle) * .075)
    parts.push(petal)
  }
  const center = new THREE.SphereGeometry(.035, 6, 4); center.translate(0, .59, 0); parts.push(center)
  const merged = mergeGeometries(parts)
  parts.forEach(part => part.dispose())
  return merged
}

export function WindVegetation({ near = false, low = false, ground = groundHeight, origin = [0, 0], golden = false, woodland = false, meadowPath }: { near?: boolean; low?: boolean; ground?: (x: number, z: number) => number; origin?: [number, number]; golden?: boolean; woodland?: boolean; meadowPath?: (z: number) => number }) {
  const invalidate = useThree(state => state.invalidate)
  const grass = useRef<THREE.InstancedMesh>(null)
  const stems = useRef<THREE.InstancedMesh>(null)
  const flowers = useRef<THREE.InstancedMesh>(null)
  const material = useWindMaterial()
  const blade = useMemo(bladeGeometry, [])
  const blossom = useMemo(blossomGeometry, [])
  const stem = useMemo(() => new THREE.CylinderGeometry(.009, .014, .57, 5).translate(0, .285, 0), [])
  const count = low ? 350 : near ? 1100 : 1350
  const flowerCount = woodland ? 4 : low ? 18 : 42
  useEffect(() => () => { blade.dispose(); blossom.dispose(); stem.dispose() }, [blade, blossom, stem])
  useEffect(() => {
    if (!grass.current || !stems.current || !flowers.current) return
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const angle = random(i, 33) * Math.PI * 2, radius = Math.sqrt(random(i, 34)) * 4.75
      const x = Math.cos(angle) * radius + origin[0], z = Math.sin(angle) * radius + origin[1]
      dummy.position.set(x, ground(x, z), z)
      dummy.rotation.set(0, random(i, 35) * Math.PI * 2, 0)
      const pathClearance = meadowPath
        ? THREE.MathUtils.smoothstep(Math.abs(x - meadowPath(z)), .38, 1.15)
        : 1
      const height = woodland ? .1 + random(i, 36) ** 1.7 * .27 : (near ? .4 : .22) + random(i, 36) * (near ? .35 : .28)
      if (ground(x, z) < -.2 || pathClearance === 0) {
        dummy.scale.setScalar(0)
      } else {
        dummy.scale.set(.6 + random(i, 37) * .5, height * (golden ? 1.5 : 1) * pathClearance, 1)
      }
      dummy.updateMatrix()
      grass.current.setMatrixAt(i, dummy.matrix)
      grass.current.setColorAt(i, new THREE.Color((golden ? ['#c1ad66', '#d9c589', '#aaa365', '#ead9a1'] : meadowPath ? ['#9dbb72', '#bbca86', '#aac480', '#c4cf93'] : ['#7b9b68', '#a0b37e', '#8da677', '#bdc897'])[i % 4]))
    }
    for (let i = 0; i < flowerCount; i++) {
      const center = [[-2.5, .8], [2.3, .6], [.6, 2.6]][i % 3]
      const angle = random(i, 40) * Math.PI * 2, radius = Math.sqrt(random(i, 41)) * .95
      const x = center[0] + Math.cos(angle) * radius + origin[0], z = center[1] + Math.sin(angle) * radius + origin[1]
      dummy.position.set(x, ground(x, z), z); dummy.rotation.set(0, angle, 0)
      const flowerScale = meadowPath
        ? (ground(x, z) > -.2 ? .53 * THREE.MathUtils.smoothstep(Math.abs(x - meadowPath(z)), .75, 1.15) : 0)
        : woodland ? (ground(x, z) > .12 ? .44 : 0) : 1
      dummy.scale.setScalar((.7 + random(i, 42) * .65) * flowerScale); dummy.updateMatrix()
      stems.current.setMatrixAt(i, dummy.matrix); flowers.current.setMatrixAt(i, dummy.matrix)
      stems.current.setColorAt(i, new THREE.Color('#78946b'))
      flowers.current.setColorAt(i, new THREE.Color(['#f5e9c8', '#d8c4dc', '#ede5c9', '#f0d4c5'][i % 4]))
    }
    for (const mesh of [grass.current, stems.current, flowers.current]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
      // Vertex displacement is bounded; conservatively include the moving tips.
      if (mesh.boundingSphere) mesh.boundingSphere.radius += 1
    }
    invalidate()
    const meshes = [grass.current, stems.current, flowers.current]
    return () => { meshes.forEach(mesh => mesh.dispose()) }
  }, [count, flowerCount, woodland, near, invalidate, ground, origin[0], origin[1], golden, meadowPath])
  return <group name="hero-wind-vegetation" dispose={null}>
    <instancedMesh ref={grass} args={[blade, material, count]} receiveShadow />
    <instancedMesh ref={stems} args={[stem, material, flowerCount]} />
    <instancedMesh ref={flowers} args={[blossom, material, flowerCount]} />
  </group>
}

/** A branched trunk and instanced leaf clusters give the Hero its own silhouette. */
export function MeadowTree({ x, z, scale = 1, low = false, ground = groundHeight }: { x: number; z: number; scale?: number; low?: boolean; ground?: (x: number, z: number) => number }) {
  const invalidate = useThree(state => state.invalidate)
  const sway = useRef<THREE.Group>(null)
  const leaves = useRef<THREE.InstancedMesh>(null)
  const dynamics = useDynamics()
  const count = low ? 65 : 145
  const trunk = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(.14, .8, .02), new THREE.Vector3(-.13, 1.6, 0), new THREE.Vector3(.05, 2.8, .1),
  ]), 16, .115, 7, false), [])
  useEffect(() => () => trunk.dispose(), [trunk])
  useEffect(() => {
    if (!leaves.current) return
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const angle = random(i, 52) * Math.PI * 2, radius = Math.sqrt(random(i, 53))
      dummy.position.set(Math.cos(angle) * radius * 1.5 - .2, 2.55 + (1 - radius) * .9 + random(i, 54) * .25, Math.sin(angle) * radius * 1.1)
      dummy.rotation.set(random(i, 55), angle, random(i, 56))
      const size = low ? .52 : .35 + random(i, 57) * .18
      dummy.scale.set(size * 1.2, size * .65, size); dummy.updateMatrix()
      leaves.current.setMatrixAt(i, dummy.matrix)
      leaves.current.setColorAt(i, new THREE.Color(['#7f9f7c', '#9cb48a', '#b4c69b', '#769579'][i % 4]))
    }
    leaves.current.instanceMatrix.needsUpdate = true
    if (leaves.current.instanceColor) leaves.current.instanceColor.needsUpdate = true
    leaves.current.computeBoundingSphere()
    invalidate()
  }, [count, low, invalidate])
  useFrame(() => {
    if (sway.current) sway.current.rotation.z = windPhase(dynamics.current.time, x, z) * dynamics.current.wind * .7
  })
  return <group position={[x, ground(x, z), z]} scale={scale}><group ref={sway}>
    <mesh castShadow><primitive object={trunk} attach="geometry" /><meshStandardMaterial color="#8e795a" roughness={1} /></mesh>
    {[[-.5, 1.8, -.1, -.6], [.55, 2, .05, .65], [-.18, 2.5, -.35, .3]].map(([a, b, c, rotation], i) =>
      <mesh key={i} position={[a, b, c]} rotation={[.2, 0, -rotation]} castShadow><cylinderGeometry args={[.035, .08, 1.5, 6]} /><meshStandardMaterial color="#8e795a" roughness={1} /></mesh>)}
    <instancedMesh ref={leaves} args={[undefined, undefined, count]} castShadow receiveShadow><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial roughness={.95} /></instancedMesh>
  </group></group>
}

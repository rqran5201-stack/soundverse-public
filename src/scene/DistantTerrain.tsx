import { useEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, Object3D, Float32BufferAttribute, MathUtils, PlaneGeometry } from 'three'
import { useThree } from '@react-three/fiber'
import { random } from '../dreamscape'
import type { WorldId } from '../storage'
import { TerrainMaterial } from './TerrainMaterial'

type Ridge = {
  x: number; z: number; width: number; depth: number; height: number
  soil: string; cover: string; seed: number
}

const ridges: Record<WorldId, Ridge[]> = {
  sea: [
    {x:17,z:-36,width:17,depth:12,height:3.7,soil:'#646e65',cover:'#829279',seed:1},
    {x:32,z:-50,width:27,depth:14,height:5.2,soil:'#697c7d',cover:'#83968a',seed:5},
  ],
  moon: [
    {x:-12,z:-32,width:34,depth:21,height:7.6,soil:'#354844',cover:'#3c504a',seed:2},
    {x:17,z:-37,width:38,depth:24,height:9.4,soil:'#354b4c',cover:'#435851',seed:6},
    {x:0,z:-49,width:68,depth:23,height:13,soil:'#3f5259',cover:'#475b59',seed:8},
  ],
  field: [
    {x:2,z:-41,width:96,depth:32,height:8,soil:'#78896f',cover:'#8d9d73',seed:3},
    {x:16,z:-62,width:136,depth:37,height:13,soil:'#75909c',cover:'#8b9e9b',seed:7},
  ],
}

const canopyCount = 50
const crownsPerTree = 3

function RidgeMesh({ ridge, wooded }: { ridge: Ridge; wooded: boolean }) {
  const trees = useRef<InstancedMesh>(null)
  const invalidate = useThree(state => state.invalidate)
  const geometry = useMemo(() => {
    const { width, depth, height, soil, cover, seed } = ridge
    const mesh = new PlaneGeometry(width, depth, 88, 28)
    mesh.rotateX(-Math.PI / 2)
    const positions = mesh.attributes.position
    const rock = new Color(soil), foliage = new Color(cover), color = new Color()
    const colors: number[] = []
    for (let i = 0; i < positions.count; i++) {
      const u = 2 * positions.getX(i) / width
      const v = 2 * positions.getZ(i) / depth
      const shoulder = 1 - MathUtils.smoothstep(Math.abs(u), .63, 1)
      const crest = .19 * Math.sin(u * 8 + seed)
      const profile = Math.max(0, 1 - Math.abs(v - crest) / .81)
      const folds = .58 + .22 * Math.sin(u * 7 + seed) + .13 * Math.sin(u * 18 - v * 2 + seed)
      const detail = .07 * Math.sin(u * 37 + v * 5) * Math.cos(v * 12 - seed)
      const y = -1.1 + height * shoulder * Math.pow(profile, 1.35) * (folds + detail)
      positions.setY(i, y)
      const vegetation = MathUtils.clamp(.55 + .28 * Math.sin(u * 21 - v * 3 + seed) + .13 * Math.cos(v * 18), .1, .9)
      const exposed = MathUtils.smoothstep(folds + detail, .49, .82)
      color.copy(rock).lerp(foliage, vegetation * (1 - exposed * .52))
        .multiplyScalar(.83 + .17 * profile + .09 * Math.sin(u * 31 + v * 9))
      colors.push(color.r, color.g, color.b)
    }
    mesh.setAttribute('color', new Float32BufferAttribute(colors, 3))
    mesh.computeVertexNormals()
    return mesh
  }, [ridge])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => {
    const canopy = trees.current
    if (!canopy) return
    const position = geometry.attributes.position
    const tree = new Object3D()
    const color = new Color()
    const shaded = new Color('#263a39'), lit = new Color('#5b7068')
    for (let i = 0; i < canopyCount; i++) {
      const row = 7 + Math.floor(random(i, ridge.seed + 8) * 14)
      const col = 11 + Math.floor(random(i, ridge.seed + 17) * 67)
      const sample = row * 89 + col
      const height = .85 + random(i, ridge.seed + 29) ** 1.65 * 2
      const width = height * (.35 + random(i, 73) * .32)
      const x = position.getX(sample), y = position.getY(sample), z = position.getZ(sample)
      const bearing = random(i, 37) * Math.PI * 2
      for (let crown = 0; crown < crownsPerTree; crown++) {
        const angle = bearing + crown * 2.4
        const spread = crown === 0 ? 0 : width * .39
        const h = crown === 0 ? .69 : .43 + .11 * crown
        tree.position.set(x + Math.cos(angle) * spread, y + height * h, z + Math.sin(angle) * spread)
        tree.rotation.set(.18 * Math.sin(angle), angle, .19 * Math.cos(angle))
        tree.scale.set(width * (crown === 0 ? .75 : 1), height * (crown === 0 ? .78 : .52), width * .76)
        tree.updateMatrix()
        const index = i * crownsPerTree + crown
        canopy.setMatrixAt(index, tree.matrix)
        canopy.setColorAt(index, color.copy(shaded).lerp(lit, .1 + random(i, 18) * .48 + crown * .11))
      }
    }
    canopy.instanceMatrix.needsUpdate = true
    if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true
    canopy.computeBoundingSphere()
    invalidate()
  }, [geometry, invalidate, ridge])
  return <group position={[ridge.x, 0, ridge.z]}>
    <mesh geometry={geometry}><TerrainMaterial /></mesh>
    {wooded && <instancedMesh ref={trees} args={[undefined, undefined, canopyCount * crownsPerTree]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>}
  </group>
}

export default function DistantTerrain({ world }: { world: WorldId }) {
  return <group name="distant-terrain">{ridges[world].map(ridge => <RidgeMesh key={ridge.seed} ridge={ridge} wooded={world === 'moon'}/>)}</group>
}

import shrubUrl from '../assets/models/moon-shrubs.glb'
import archUrl from '../assets/models/sea-arch.glb'
import grassUrl from '../assets/models/field-wind-grass.glb'
import reefUrl from '../assets/models/sea-reef.glb'
import { useMemo, type ReactNode } from 'react'
import type { WorldId } from '../storage'
import type { LuxAsset } from '../luxAsset'
import { worldGroundHeight } from '../worlds/terrain'
import treeUrl from '../assets/models/moon-tall-tree.glb'
import flowerUrl from '../assets/models/moon-flowers.glb'
import rockUrl from '../assets/models/moon-moss-rock.glb'
import fernUrl from '../assets/models/moon-ferns.glb'
import { useCuratedAsset } from './useCuratedAsset'

type Placement = readonly [x: number, z: number, size: number]
const trees: Placement[] = [[-6,-5,4.7],[11,-6,5.1],[-9,3,4.1],[12,4,4.7],[-9,-12,6.2],[12,-12,6.5],[-5,-17,6.8],[9,-18,5.8],[-14,-16,7.4],[15,-17,7],[-13,9,5.4],[14,10,5.2]]
const flowers: Placement[] = [[-8,-5,.36],[12,-9,.32]]
const rocks: Placement[] = [[-4.8,1,.49],[4.8,-.9,.67],[-8,-7,.85],[10,4,.71],[-12,-10,.74]]
const ferns: Placement[] = [[-3.6,3.4,.56],[4.5,3.3,.55],[-9,-3,.75],[10,-5,.88],[-11,7,.62],[13,-10,.86]]

function Placements({ world, asset, points, name, floor, sink = 0 }: { floor?: number; sink?: number; world: WorldId; asset: LuxAsset; points: Placement[]; name: string }) {
  const models = useMemo(() => points.map(() => asset.scene.clone(true)), [asset, points])
  return <group name={name} dispose={null}>{points.map(([x,z,size], index) =>
    <group key={index} position={[x, floor ?? worldGroundHeight(world, x, z) - sink * size, z]} rotation={[0, index * 2.39996, 0]} scale={asset.scale * size}>
      <group position={asset.offset}><primitive object={models[index]} /></group>
    </group>
  )}</group>
}

const lowTrees = trees.filter((_,index) => index !== 8 && index !== 9)

const coastalRocks: Placement[] = [[3.7,2.9,.48],[4.18,2.45,.24],[-3.8,2.7,.39],[-3.45,2.94,.2],[-2.7,-3.5,.34],[-7,-9,.56],[-7.6,-9.2,.27],[-10,7,.62],[-14,-12,.46],[-5,-15,.33]]
const coastalFerns: Placement[] = [[-3.4,-1.9,.3],[2.9,2.6,.28]]
const fieldTrees: Placement[] = [[-7,-13,2.5]]
const fieldRocks: Placement[] = [[4.5,3.5,.48],[4.92,3.2,.25],[-5.2,1.2,.62],[-5.7,1.48,.31],[3,-7,.36],[-9,-11,.38],[-12,-17,.53],[-12.5,-17.3,.24],[2,-18,.31]]
const fieldFerns: Placement[] = [[-7.4,-8,.58],[-10.5,-12,.52]]

export default function MoonForestAssets({ world = 'moon', low, treeFallback, plantFallback }: {
  world?: Exclude<WorldId, 'sea'>; low: boolean; treeFallback?: ReactNode; plantFallback?: ReactNode
}) {
  const tree = useCuratedAsset(treeUrl, 'Moon forest tall tree', 20 * 1024 * 1024).asset
  const flower = useCuratedAsset(flowerUrl, 'Moon forest flowers').asset
  const rock = useCuratedAsset(rockUrl, 'Moon forest moss rock').asset
  const fern = useCuratedAsset(fernUrl, 'Moon forest ferns').asset
  return <>
    {tree ? <Placements world={world} asset={tree} points={world === 'field' ? fieldTrees : low ? lowTrees : trees} name={`user-${world}-trees`}/> : treeFallback}
    {world === 'moon' && flower && <Placements world={world} asset={flower} points={flowers} name={`user-${world}-flowers`}/>}
    {rock && <Placements world={world} asset={rock} points={world === 'field' ? fieldRocks : rocks} name={`user-${world}-rocks`} sink={.24}/>}
    {fern ? <Placements world={world} asset={fern} points={world === 'field' ? fieldFerns : ferns} name={`user-${world}-ferns`}/> : plantFallback}
  </>
}


export function CoastalAssets() {
  const rock = useCuratedAsset(rockUrl, 'Coastal moss rock').asset
  const fern = useCuratedAsset(fernUrl, 'Coastal ferns').asset
  return <>
    {rock && <Placements world="sea" asset={rock} points={coastalRocks} name="user-sea-rocks" sink={.25}/>}
    {fern && <Placements world="sea" asset={fern} points={coastalFerns} name="user-sea-ferns"/>}
  </>
}

const archPoints: Placement[] = [[8.3,-9,1.65]]
const meadowGrass: Placement[] = [[-3.6,4,.55], [3.9,2.6,.68], [-5,1.5,.72], [-6,-3,.73], [-8,-6,.66], [2,-6,.62], [-7,-12,.58], [2,-14,.55]]
const reefPoints: Placement[] = [[1,0,1.2],[-3,-4,1.5],[6,-4,1.35],[-7,3,1.2],[4,5,.9]]

export function CoastalArch() {
  const { asset } = useCuratedAsset(archUrl, 'Sea arch', 22 * 1024 * 1024)
  return asset && <Placements world="sea" asset={asset} points={archPoints} floor={-.43} name="sea-arch"/>
}

export function MeadowGrass() {
  const { asset } = useCuratedAsset(grassUrl, 'Meadow wind grass', 34 * 1024 * 1024)
  return asset && <Placements world="field" asset={asset} points={meadowGrass} name="meadow-wind-grass"/>
}

export function SeaReef({ fallback }: { fallback: ReactNode }) {
  const { asset } = useCuratedAsset(reefUrl, 'Sea reef', 26 * 1024 * 1024)
  return asset ? <Placements world="sea" asset={asset} points={reefPoints} floor={0} name="sea-reef"/> : fallback
}

const shrubs: Placement[] = [[-5,-2,.48],[-7,-6,.66],[-9,4,.59],[-10,-10,.75],[10,-4,.75],[11,3,.56],[12,-9,.72],[-8,-16,.69],[-13,9,.49],[12,-15,.67],[14,2,.43]]

export function MoonShrubs() {
  const { asset } = useCuratedAsset(shrubUrl, 'Moon forest deciduous shrubs', 32 * 1024 * 1024)
  return asset && <Placements world="moon" asset={asset} points={shrubs} name="user-moon-shrubs"/>
}

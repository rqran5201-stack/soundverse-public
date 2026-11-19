import ComposedPreview, { PreviewView } from './scene/ComposedPreview'
import type { CompiledWorld } from './worlds/worldComposer'
import DistantTerrain from './scene/DistantTerrain'
import { coastHeight as coastalGround } from './dreamscape'
import { WindVegetation } from './scene/WindVegetation'
import DistantBirds from './scene/DistantBirds'
import { CoastalArch, CoastalAssets } from './scene/MoonForestAssets'
import { ExplorationControls, ExplorationEnvironment, DEFAULT_EXPLORATION, type Exploration } from './scene/Exploration'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Sparkles } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { groundHeight, random } from './dreamscape'
import type { Seed, WorldId } from './storage'
import type { LuxAsset } from './luxAsset'
import { WORLD_PALETTES as palettes, type Palette } from './worlds/catalog'
import type { AudioSignals } from './audio/signals'
import { DynamicsProvider, useDynamics, windPhase } from './scene/dynamics'
import { Island, Tree, Water, Wildflowers } from './scene/Nature'
import { useHeroLowQuality, type HeroQuality } from './scene/useHeroQuality'
import AdaptiveQuality from './scene/AdaptiveQuality'
import CuratedTree from './scene/CuratedTree'
import FeaturedMushroom, { type FeaturedStatus } from './scene/FeaturedMushroom'
import SongLandscape from './scene/SongLandscape'
import GrowingWish from './scene/GrowingWish'
import AncientMoonTree from './scene/AncientMoonTree'
import PlacementSurface from './scene/PlacementSurface'
import { WORLD_DEFINITIONS } from './worlds/definitions'
import HeroLandscape from './scene/HeroLandscape'
import { clone } from 'three/addons/utils/SkeletonUtils.js'


function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  return reduced
}

function LandscapeDetails({ palette }: { palette: Palette }) {
  const invalidate = useThree(state => state.invalidate)
  const grass = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    if (!grass.current) return
    const dummy = new THREE.Object3D()
    for (let i=0;i<650;i++) {
      const angle=random(i,4)*Math.PI*2, radius=Math.sqrt(random(i,5))*4.65
      const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius
      dummy.position.set(x,groundHeight(x,z)+.043,z)
      dummy.rotation.set((random(i,6)-.5)*.3,angle,(random(i,7)-.5)*.4)
      dummy.scale.set(.7+random(i,8),.25+random(i,9)*.72,.8)
      dummy.updateMatrix();grass.current.setMatrixAt(i,dummy.matrix)
      grass.current.setColorAt(i,new THREE.Color(palette.leaves[i%3]).lerp(new THREE.Color(palette.grass),.4))
    }
    grass.current.instanceMatrix.needsUpdate = true
    if (grass.current.instanceColor) grass.current.instanceColor.needsUpdate = true
    grass.current.computeBoundingSphere()
    invalidate()
  },[palette,invalidate])
  return <>
    <instancedMesh ref={grass} args={[undefined,undefined,650]}><coneGeometry args={[.026,.24,3]} /><meshStandardMaterial roughness={1} /></instancedMesh>
    {Array.from({length:11},(_,i)=>{const z=3.9-i*.48,x=Math.sin(i*.55)*.7+.8;return <mesh key={i} position={[x,groundHeight(x,z)+.035,z]} rotation={[0,i*.8,0]} scale={[.21,.045,.15]} receiveShadow><icosahedronGeometry args={[1,1]} /><meshStandardMaterial color="#a7a08a" roughness={1}/></mesh>})}
    <CloudBank />
    <mesh position={[-.6,groundHeight(-.6,2.65)+.012,2.65]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.7,.73,64]}/><meshStandardMaterial color="#efe1ac" transparent opacity={.6} roughness={1}/></mesh>
  </>
}

function CloudBank() {
  const group = useRef<THREE.Group>(null)
  const dynamics = useDynamics()
  useFrame(() => { if (group.current) group.current.position.x = Math.sin(dynamics.current.time * .025) * 2 })
  return <group ref={group}>    {[[-14,7,-24],[10,9,-32],[25,8,-45]].map(([x,y,z],i)=><group key={i} position={[x,y,z]} scale={1.8}>
      {[[-1,0,0],[0,.18,0],[1.2,-.05,0],[.2,-.15,.35]].map(([a,b,c],j)=><mesh key={j} position={[a,b,c]} scale={[1.5,.38,.6]}><sphereGeometry args={[1,12,8]} /><meshBasicMaterial color="#f8edda" transparent opacity={.38} depthWrite={false}/></mesh>)}
    </group>)}
</group>
}

function MusicMotes({ color }: { color: string }) {
  const group = useRef<THREE.Group>(null)
  const dynamics = useDynamics()
  useFrame(() => {
    if (!group.current) return
    const {time, shimmer, pulse} = dynamics.current
    group.current.rotation.y = time * .025
    group.current.position.y = shimmer * .5 + pulse * .12
    group.current.scale.setScalar(1 + shimmer * .12)
  })
  return <group ref={group}><Sparkles count={45} scale={[15, 7, 15]} size={2} speed={0} color={color} /></group>
}

function LuxTree({ x, z, asset, motion, modelScale=1 }: { x: number; z: number; asset: LuxAsset; energy: number; motion: boolean; modelScale?:number }) {
  const object = useMemo(() => {
    const scene = clone(asset.scene)
    scene.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true } })
    return scene
  }, [asset])
  const dynamics = useDynamics()
  const sway = useRef<THREE.Group>(null)
  useFrame(() => {
    if (sway.current) sway.current.rotation.z = motion ? windPhase(dynamics.current.time, x, z) * dynamics.current.wind * .65 : 0
  })
  return <group ref={sway} position={[x, groundHeight(x,z)+.02, z]} scale={asset.scale*modelScale} dispose={null}><group position={asset.offset}><primitive object={object} /></group></group>
}

function ContextStatus({ onLost }: { onLost: (lost: boolean) => void }) {
  const { gl } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (event: Event) => { event.preventDefault(); onLost(true) }
    const restored = () => onLost(false)
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    canvas.dataset.rendererReady = 'true'
    return () => {
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
      delete canvas.dataset.rendererReady
    }
  }, [gl, onLost])
  return null
}

function WorldScene({ composedPreview, exploration, energy, seeds, asset, generatedAssets, worldId, reduced, low, onFeaturedStatus, onTreeStatus, selectedId, placing, onSelect, onPlace }: {
  selectedId?: string | null; placing?:boolean; onSelect?:(id:string)=>void; onPlace?:(x:number,z:number)=>void;
  composedPreview?: {result:CompiledWorld; view:number}; exploration: Exploration; energy: number; seeds: Seed[]; asset: LuxAsset | null; generatedAssets: Record<string, LuxAsset>; worldId: WorldId; reduced: boolean; low: boolean; onFeaturedStatus: (status: FeaturedStatus) => void; onTreeStatus: (status: FeaturedStatus) => void
}) {
  const palette = palettes[worldId]
  const [moonTreeAsset, setMoonTreeAsset] = useState<LuxAsset | null>(null)
  const [moonMushroomAsset,setMoonMushroomAsset]=useState<LuxAsset|null>(null)
  const nativeMushroomIds=worldId==='moon'?seeds.filter(seed=>seed.source==='music'&&seed.kind==='mushroom').slice(0,2).map(seed=>seed.id):[]
  const nativeTreeId = worldId === 'moon' ? seeds.find(seed => seed.kind === 'tree')?.id : undefined
  return <>
    {worldId === 'sea' ? <>
    <color attach="background" args={[palette.sky]} /><fog attach="fog" args={[palette.fog, 24, 100]} />
    <hemisphereLight args={[palette.sky, '#87926c', 1.65]} />
    <directionalLight castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-bias={-.0005} position={[-7, 13, 6]} intensity={2.2} color={palette.light} />
    <Water coast energy={energy} motion={!reduced} color="#518f98" sky={palette.sky} shoreCenter={[-1000, 0]} /><Island palette={palette} coast /><DistantBirds low={low} />
    <CuratedTree x={-2.45} z={-1.1} scale={1.15} onStatus={onTreeStatus} fallback={<Tree x={-2.45} z={-1.1} energy={energy} motion={!reduced} palette={palette} scale={1.15} />} />
    <CoastalArch /><CoastalAssets />
    {([[-7,3],[-8,-6],[-12,-13],[-13,6],[-16,-3],[-9,12],[-4,-14]] as [number, number][]).map(origin =>
      <WindVegetation key={origin.join(',')} origin={origin} ground={coastalGround} low/>
    )}<group scale={[.72, .42, .72]} position={[-2.6, .26, -1]}><Wildflowers palette={palette} /></group><LandscapeDetails palette={palette} />
    <DistantTerrain world="sea" />
    </> : <><SongLandscape worldId={worldId} low={low} />{worldId === 'moon' && <><FeaturedMushroom onStatus={onFeaturedStatus} onAsset={setMoonMushroomAsset} /><AncientMoonTree onStatus={onTreeStatus} onAsset={setMoonTreeAsset} /></>}</>}
    {seeds.map(s => {const model = generatedAssets[s.id] || (s.source==='music'?null:asset) || (s.id === nativeTreeId ? moonTreeAsset : null) || (nativeMushroomIds.includes(s.id)?moonMushroomAsset:null); return <GrowingWish key={s.id} seed={s} palette={palette} reduced={reduced} selected={s.id===selectedId} onSelect={placing?undefined:onSelect}>{model ? <LuxTree x={s.x} z={s.z} asset={model} modelScale={model === moonMushroomAsset ? .7 : 1} energy={energy} motion={!reduced} /> : (!s.kind || s.kind === 'tree') ? <Tree x={s.x} z={s.z} energy={energy} motion={!reduced} palette={palette} scale={.65} luminous /> : undefined}</GrowingWish>})}

    {worldId === 'sea' && <MusicMotes color={palette.light} />}
    <ExplorationEnvironment exploration={exploration} worldId={worldId} placing={placing}/><PlacementSurfaceGate worldId={worldId} placing={placing} onPlace={onPlace}/><OrbitControls enabled={!composedPreview && !placing && exploration.layer === 'ground'} enablePan={false} enableDamping={!reduced} target={WORLD_DEFINITIONS[worldId].target} minDistance={8} maxDistance={24} maxPolarAngle={Math.PI / 2 - .025} />
    {composedPreview && <><ComposedPreview result={composedPreview.result}/><PreviewView {...composedPreview}/></>}
  </>
}

function PlacementSurfaceGate({worldId,placing,onPlace}:{worldId:WorldId;placing?:boolean;onPlace?:(x:number,z:number)=>void}) {
  const invalidate=useThree(state=>state.invalidate)
  useEffect(()=>invalidate(),[placing,invalidate])
  return placing?<PlacementSurface worldId={worldId} onPlace={onPlace}/>:null
}

export type WorldProps = { composedPreview?: {result:CompiledWorld; view:number}; selectedId?:string|null; placing?:boolean; onSelect?:(id:string)=>void; onPlace?:(x:number,z:number)=>void; presentation?: 'hero' | 'studio'; quality?: HeroQuality; softwareRenderer?: boolean; audioSignals?: RefObject<AudioSignals>; energy?: number; seeds?: Seed[]; asset?: LuxAsset | null; generatedAssets?: Record<string, LuxAsset>; worldId?: WorldId }
export default function World({ composedPreview, presentation = 'studio', quality = 'auto', softwareRenderer = false, audioSignals, energy = 0, seeds = [], asset = null, generatedAssets = {}, worldId = 'sea', selectedId, placing, onSelect, onPlace }: WorldProps) {
  const [exploration, setExploration] = useState(DEFAULT_EXPLORATION)
  const reduced = useReducedMotion()
  const hintedLow = useHeroLowQuality(quality)
  const [slowAuto, setSlowAuto] = useState(false)
  const low = presentation === 'hero' ? (hintedLow || (quality === 'auto' && (slowAuto || softwareRenderer))) : softwareRenderer
  const [lost, setLost] = useState(false)
  const [featuredStatus, setFeaturedStatus] = useState<FeaturedStatus>('loading')
  const [treeStatus, setTreeStatus] = useState<FeaturedStatus>('loading')
  const camera = useMemo(() => ({ position: (presentation === 'hero' ? [0, 3.8, 20] : WORLD_DEFINITIONS[worldId].camera) as [number, number, number], fov: presentation === 'hero' ? 48 : worldId === 'moon' ? 46 : 52 }), [presentation, worldId])
  return <div className="world-view" data-curated-music-mushrooms={worldId==='moon'&&featuredStatus==='ready'?seeds.filter(seed=>seed.source==='music'&&seed.kind==='mushroom').slice(0,2).filter(seed=>!generatedAssets[seed.id]).length:0} data-selected-id={selectedId??''} data-placing={!!placing} data-world={worldId} data-layout={WORLD_DEFINITIONS[worldId].spatialForm} data-featured-tree={presentation === 'hero' || worldId === 'sea' || worldId === 'moon' ? treeStatus : 'none'} data-featured-model={worldId === 'moon' && presentation === 'studio' ? featuredStatus : 'none'} data-curated-tree-wishes={presentation === 'studio' && worldId === 'moon' && treeStatus === 'ready' && seeds.some(seed => seed.kind === 'tree') ? 1 : 0} data-presentation={presentation} data-quality={low ? 'low' : 'high'} data-reduced-motion={reduced} data-model={asset || seeds.some(seed=>generatedAssets[seed.id]) ? 'glb' : 'procedural'} role="group" aria-label={`${{ sea: '风之海', moon: '月光森林', field: '夏日旷野' }[worldId]}互动三维景观`}>
    <Canvas frameloop={reduced ? 'demand' : 'always'} shadows={!low} role="img" aria-label={presentation === 'hero' ? '随音乐流动的自然梦境' : '可拖动旋转的三维景观'} camera={camera} dpr={low ? 1 : [1, 1.5]} gl={{ antialias: presentation === 'hero' || !softwareRenderer }}><DynamicsProvider signals={audioSignals} reduced={reduced} worldId={worldId}><ContextStatus onLost={setLost} /><AdaptiveQuality enabled={presentation === 'hero' && quality === 'auto' && !low && !reduced} onSlow={() => setSlowAuto(true)} />{presentation === 'hero' ? <HeroLandscape reduced={reduced} low={low} onTreeStatus={setTreeStatus} /> : <WorldScene key={worldId} composedPreview={composedPreview} exploration={composedPreview ? {...DEFAULT_EXPLORATION,time:composedPreview.result.night?'night':'day'} : exploration} energy={energy} seeds={seeds} asset={asset} generatedAssets={generatedAssets} worldId={worldId} reduced={reduced} low={low} onFeaturedStatus={setFeaturedStatus} onTreeStatus={setTreeStatus} selectedId={selectedId} placing={placing} onSelect={onSelect} onPlace={onPlace} />}</DynamicsProvider></Canvas>
    {presentation === 'studio' && worldId === 'moon' && <div className="featured-credit" role="status" aria-live="polite">{featuredStatus === 'ready' ? `Lux3D 特色资产 · 月光蘑菇簇${treeStatus === 'ready' ? ' · 你的月光古树' : treeStatus === 'fallback' ? ' · 古树暂不可用' : ' · 古树载入中'}` : featuredStatus === 'loading' ? '特色蘑菇正在载入 · 可先自由探索' : '特色蘑菇暂不可用 · 已保留基础景观'}</div>}
    {presentation === 'studio' && !composedPreview && <ExplorationControls value={exploration} onChange={setExploration} placing={placing}/>}
    {lost && <div className="scene-fallback" role="status"><strong>三维连接已暂停</strong><p>等待浏览器恢复。你的愿望仍可编辑和保存。</p></div>}
  </div>
}

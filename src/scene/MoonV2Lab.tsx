import { suggestSpatial, type SpatialExpression } from '../worlds/spatialExpression'
import { fingerprint, readMoonWorks, restoreMoonWork, writeMoonWork, type MoonWork, type SongIdentity, type ObjectOverride } from '../worlds/moonWorks'
import { analyzeSong, type SongFeatureTimeline } from '../audio/songFeatures'
import { useAudio } from '../useAudio'
import { makeMoonDemo, makeMoonPulseDemo } from '../worlds/moonDemo'
import { publicWeb } from '../publicWeb'
import { narrativeState, type MoonNarrativeState } from '../worlds/moonNarrative'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { BufferGeometry, Color, Float32BufferAttribute, Object3D, PlaneGeometry, InstancedMesh, CylinderGeometry, IcosahedronGeometry, DoubleSide } from 'three'
import { random } from '../dreamscape'
import { creekClearance, creekSection, moonV2Height, moonV2Trees } from '../worlds/moonTerrainV2'
import { compileWorld, type CompiledWorld } from '../worlds/worldComposer'
import { proposeWorld, type WorldNarrativeBlueprint, type Composition } from '../worlds/narrativeBlueprint'
import ComposedPreview, { PreviewView } from './ComposedPreview'
import { TerrainMaterial } from './TerrainMaterial'
import { useCuratedAsset } from './useCuratedAsset'
import treeUrl from '../assets/models/moon-tall-tree.glb'
import rockUrl from '../assets/models/moon-moss-rock.glb'
import fernUrl from '../assets/models/moon-ferns.glb'

type CameraPose = readonly [readonly [number, number, number], readonly [number, number, number]]
const views: Record<string, CameraPose> = {
  entrance: [[3.5, 2.6, 12.2], [3.25, 1.16, -3.8]],
  bank: [[3.0, 1.9, -2], [7.1, .28, -13]],
  overhead: [[10, 27, 17], [3, 0, -6]],
  creek: [[1.2, 2.25, -9.6], [4.0, .75, -18.5]],
  clearing: [[-9.5, 1.95, -4.1], [-11.95, 1.25, -7.9]],
}
const labels = {entrance:'入口',bank:'溪岸',overhead:'俯瞰',creek:'沿溪远望',clearing:'林隙停留'}
const sampleTimeline: SongFeatureTimeline={version:2,durationMs:9000,windowMs:1000,windowTimestamp:'start',transitionStepMs:50,windows:[],candidates:[]}
const sessionBlueprint=(timeline:SongFeatureTimeline,composition:Composition):WorldNarrativeBlueprint=>({
  schemaVersion: 1, worldId: 'moon', mode: 'interpret', revision: 1,
  expression: proposeWorld(timeline, composition),
})

function V2Land() {
  const surface = useMemo(() => {
    const mesh = new PlaneGeometry(76, 74, 192, 200)
    mesh.rotateX(-Math.PI / 2)
    mesh.translate(0, 0, -8)
    const pos = mesh.attributes.position, colors: number[] = []
    const moss = new Color('#667354'), soil = new Color('#514941'), silt = new Color('#4f5040'), moonlitSoil = new Color('#89816c'), shade = new Color()
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i), z=pos.getZ(i), y=moonV2Height(x,z), edge=creekClearance(x,z)
      pos.setY(i,y)
      const variation=.46+.25*Math.sin(x*.82+Math.cos(z*.59))+.18*Math.cos(z*1.32-x*.62)
      const wash=Math.max(0,Math.min(1,1-edge/(1.25+.36*Math.sin(z*1.23))))
      shade.copy(soil).lerp(moss, variation).lerp(silt,wash*.78)
      const clearing=Math.exp(-((x+11.1)**2/2.6+(z+6.5)**2/4.3))
      const overlook=Math.exp(-((x-1.75)**2/3+(z+12.6)**2/5))
      shade.lerp(moonlitSoil, clearing*.55+overlook*.51)
      colors.push(shade.r,shade.g,shade.b)
    }
    mesh.setAttribute('color',new Float32BufferAttribute(colors,3))
    mesh.computeVertexNormals()
    return mesh
  },[])
  useEffect(() => () => surface.dispose(),[surface])
  return <mesh geometry={surface} receiveShadow><TerrainMaterial /></mesh>
}

function V2Water({reflect = .65}:{reflect?:number}) {
  const geometry=useMemo(()=>{
    const mesh=new BufferGeometry(), points:number[]=[], indices:number[]=[], colors:number[]=[]
    const water=new Color('#42616a'), side=new Color('#4c584a'), shade=new Color()
    for(let i=0;i<=240;i++){
      const z=-31+i*56/240
      const {center,left,right,level}=creekSection(z)
      for(let column=0;column<=8;column++){
        const t=(column-4)/4, x=center+t*(t<0?left:right)
        points.push(x,level+.003,z)
        const shallows=Math.abs(t)**3
        shade.copy(water).lerp(side,shallows*.90).multiplyScalar(.92+.07*Math.sin(z*4.1+x*6.4)+.04*Math.cos(z*8.7-x*3))
        colors.push(shade.r,shade.g,shade.b)
        if(i&&column){const j=i*9+column;indices.push(j-10,j-1,j,j-10,j,j-9)}
      }
    }
    mesh.setAttribute('position',new Float32BufferAttribute(points,3))
    mesh.setAttribute('color',new Float32BufferAttribute(colors,3))
    mesh.setIndex(indices)
    mesh.computeVertexNormals()
    return mesh
  },[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry}><meshPhongMaterial vertexColors shininess={32} specular={new Color("#719295").multiplyScalar(reflect)} /></mesh>
}

const bankStones = [[-.95,-5.8,.36], [1.07,-9.3,.55], [.91,-10.1,.28], [-1.29,-14.5,.42]] as const
const rocks = bankStones.map(([side,z,size])=>{
  const {center,left,right}=creekSection(z)
  return [center+side*(side<0?left:right),z,size] as const
})
const ferns = [[-2.4,8,.44], [3.9,-6.7,.40], [-9.7,-7.7,.49], [-12.6,-7.0,.41], [11.2,-9.9,.47], [-12.7,-4.9,.46]] as const

function V2Assets({placements, showMemory, overrides, onMissing}:{placements:CompiledWorld['placements']; showMemory:boolean; overrides:Record<string,ObjectOverride>; onMissing:(missing:boolean)=>void}) {
  const {asset:tree,status:treeStatus}=useCuratedAsset(treeUrl,'Moon forest trees',20*1024*1024)
  const {asset:rock,status:rockStatus}=useCuratedAsset(rockUrl,'Moon forest moss rock')
  const {asset:fern,status:fernStatus}=useCuratedAsset(fernUrl,'Moon forest ferns')
  useEffect(()=>onMissing([treeStatus,rockStatus,fernStatus].includes('fallback')),[fernStatus,onMissing,rockStatus,treeStatus])
  const trees=useMemo(()=>tree && moonV2Trees.map(()=>tree.scene.clone()),[tree])
  const stones=useMemo(()=>rock && rocks.map(()=>rock.scene.clone()),[rock])
  const memoryStones=useMemo(()=>rock && placements.map(()=>rock.scene.clone()),[rock,placements])
  const leaves=useMemo(()=>fern && ferns.map(()=>fern.scene.clone()),[fern])
  return <group dispose={null}>
    {tree && trees && moonV2Trees.map(([x,z,h],i)=><group key={i} position={[x,moonV2Height(x,z)-.12,z]} scale={tree.scale*h/2.4} rotation={[0,i*2.36,0]}><group position={tree.offset}><primitive object={trees[i]} /></group></group>)}
    {rock && stones && rocks.map(([x,z,s],i)=><group key={i} position={[x,moonV2Height(x,z)-.16-s*.27,z]} scale={[rock.scale*s,rock.scale*s*.82,rock.scale*s]} rotation={[0,i*1.6,0]}><group position={rock.offset}><primitive object={stones[i]} /></group></group>)}
    {showMemory && rock && memoryStones && placements.map(({id,x,z,size},i)=>{
      const edit=overrides[id], factor=edit?.scale??1
      return <group key={id} name={id} position={[x,moonV2Height(x,z)-(.14+size*.18)*factor,z]}
        scale={[rock.scale*size*.69*factor,rock.scale*size*(i===1?.53:.61)*factor,rock.scale*size*.67*factor]}
        rotation={[0,1.2+i*2.2+(edit?.turn??0)*Math.PI/180,0]}>
        <group position={rock.offset}><primitive object={memoryStones[i]} /></group>
      </group>
    })}
    {fern && leaves && ferns.map(([x,z,s],i)=><group key={i} position={[x,moonV2Height(x,z)-.07,z]} scale={fern.scale*s} rotation={[0,i*2.3,0]}><group position={fern.offset}><primitive object={leaves[i]} /></group></group>)}
  </group>
}

const coverClusters = [
  [-2.6,8.5,2.2,95], [10.7,9.5,2.4,65], [.1,5.6,1.6,48],
  [4.8,1.4,2.4,110], [10.8,-3.6,2.8,120], [-.5,-2.7,2.2,100],
  [3.9,-7.3,2.4,120], [4.4,-12,2,80], [-1.5,-14.3,2.2,80],
  [-6.4,-4.7,2.6,115], [-13.2,-5.5,2.5,115], [-10.4,-9.7,2.6,135],
  [-14.8,-9.1,2.4,85], [10.9,-14.8,1.8,45],
] as const

function ForestFloor({plan}:{plan:CompiledWorld}) {
  const ref=useRef<InstancedMesh>(null)
  const invalidate=useThree(s=>s.invalidate)
  const geometry=useMemo(()=>{
    const mesh=new BufferGeometry()
    // Three irregular blades and one fallen leaf share one material and one instance.
    mesh.setAttribute('position',new Float32BufferAttribute([
      -.045,0,0, .024,0,0, -.10,.29,.02,
      -.01,0,-.02, .042,0,.03, .12,.24,.03,
      -.02,0,.024, .03,0,-.024, .015,.19,-.12,
      -.13,.014,-.05, -.03,.022,.13, .12,.018,.02,
    ],3))
    mesh.computeVertexNormals()
    return mesh
  },[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  const capacity=coverClusters.reduce((count,cluster)=>count+cluster[3],0)+plan.placements.length*26
  useEffect(()=>{
    const mesh=ref.current
    if(!mesh)return
    const clusters=[...coverClusters,...plan.placements.map(({x,z})=>[x,z,.68,26] as const)]
    const plant=new Object3D(), shade=new Color()
    const path=plan.path.samples
    const verge=plan.spatial?.opening==='open'?.85:plan.spatial?.opening==='narrow'?.03:.09
    let index=0, seed=0
    for(const [cx,cz,radius,count] of clusters){
      for(let i=0;i<count;i++){
        seed++
        const angle=random(seed,131)*Math.PI*2
        const distance=radius*random(seed,144)**.67
        const x=cx+Math.cos(angle)*distance, z=cz+Math.sin(angle)*distance*.84
        const y=moonV2Height(x,z)
        if(creekClearance(x,z)<.24 ||
           Math.hypot(x-plan.memory.center.x,z-plan.memory.center.z)<1.02 ||
           path.some(p=>(x-p.x)**2+(z-p.z)**2<(p.width+verge)**2))continue
        const slope=Math.abs(moonV2Height(x+.16,z)-moonV2Height(x-.16,z))
        if(slope>.18)continue
        const fallen=random(seed,152)<.27
        plant.position.set(x,y+.012,z)
        plant.rotation.set(0,random(seed,155)*Math.PI*2,fallen?.12:0)
        const size=.47+random(seed,159)*.98
        plant.scale.set(size*.72,fallen?.10:size*.72,size*.76)
        plant.updateMatrix()
        mesh.setMatrixAt(index,plant.matrix)
        mesh.setColorAt(index++,shade.set(fallen?'#655a45':random(seed,173)>.6?'#657759':'#405845'))
      }
    }
    mesh.count=index
    mesh.instanceMatrix.needsUpdate=true
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true
    mesh.computeBoundingSphere()
    invalidate()
  },[capacity,invalidate,plan])
  return <instancedMesh name="v2-forest-floor" ref={ref} args={[undefined,undefined,capacity]} geometry={geometry}>
    <meshLambertMaterial side={DoubleSide} />
  </instancedMesh>
}

const farCount=75
function HorizonTrees() {
  const ref=useRef<InstancedMesh>(null)
  const invalidate=useThree(s=>s.invalidate)
  const silhouette=useMemo(()=>{
    const trunk=new CylinderGeometry(.055,.10,1.9,6).translate(0,.9,0)
    const canopy=new IcosahedronGeometry(1,1)
    const positions=canopy.attributes.position
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i)
      const roughness=1+.16*Math.sin(x*8+z*4)*Math.cos(y*7-z*8)
      positions.setXYZ(i,x*roughness,y*roughness,z*roughness)
    }
    const branches=[
      canopy.clone().scale(.74,.61,.65).translate(-.25,1.38,.13),
      canopy.clone().scale(.68,.76,.56).translate(.33,1.62,-.18),
      canopy.clone().scale(.53,.60,.50).translate(-.14,2.02,-.15),
      canopy.clone().scale(.36,.35,.39).translate(.48,1.33,.33),
    ]
    const facetedTrunk=trunk.toNonIndexed()
    const mesh=mergeGeometries([facetedTrunk,...branches])
    facetedTrunk.dispose()
    trunk.dispose()
    canopy.dispose()
    for(const branch of branches)branch.dispose()
    return mesh
  },[])
  useEffect(()=>()=>silhouette.dispose(),[silhouette])
  useEffect(()=>{
    const mesh=ref.current
    if(!mesh)return
    const tree=new Object3D(), color=new Color()
    let index=0
    for(let i=0;i<farCount;i++){
      const band=Math.floor(i/25), column=i%25
      const x=(column-12)*2.86+(random(i,84)-.5)*3.5
      const z=-25-band*7-random(i,7)*8
      if(creekClearance(x,z)<2.25)continue
      const height=1.06+random(i,45)*1.65
      const width=height*(.64+random(i,217)*.53)
      tree.position.set(x,moonV2Height(x,z)-.06,z)
      tree.scale.set(width,height,width*(.78+random(i,17)*.48))
      tree.rotation.set(0,random(i,12)*Math.PI*2,(random(i,88)-.5)*.14)
      tree.updateMatrix()
      mesh.setMatrixAt(index,tree.matrix)
      mesh.setColorAt(index++,color.set(['#405851','#4f665e','#5c716a'][band]).multiplyScalar(.80+random(i,81)*.36))
    }
    mesh.count=index
    mesh.instanceMatrix.needsUpdate=true
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true
    mesh.computeBoundingSphere()
    invalidate()
  },[invalidate])
  return <instancedMesh ref={ref} args={[undefined,undefined,farCount]} geometry={silhouette}>
    <meshLambertMaterial />
  </instancedMesh>
}

function FixedCamera({pose}:{pose:CameraPose}) {
  const {camera,invalidate}=useThree()
  useEffect(()=>{
    camera.position.set(...pose[0])
    camera.lookAt(...pose[1])
    invalidate()
  },[camera,invalidate,pose])
  return null
}


function MemoryAtmosphere({plan,state,reduced}:{plan:CompiledWorld;state:MoonNarrativeState;reduced:boolean}) {
  const {x,z}=plan.memory.center, y=moonV2Height(x,z)
  const creek=plan.memory.habitat==='creek-overlook'
  const {camera}=useThree()
  const veil=useRef<import('three').Mesh>(null)
  useEffect(()=>{
    veil.current?.lookAt(camera.position.x,y+1.75,camera.position.z)
  })
  const uniforms=useMemo(()=>({density:{value:0},tint:{value:new Color('#526774')}}),[])
  uniforms.density.value=state.veil*(reduced?.44:1)
  const samples=plan.path.samples
  const edge=state.guide*(samples.length-1)
  const left=samples[Math.floor(edge)],right=samples[Math.min(samples.length-1,Math.ceil(edge))]
  const mix=edge-Math.floor(edge)
  const guideX=left.x+(right.x-left.x)*mix,guideZ=left.z+(right.z-left.z)*mix
  return <>
    <pointLight name="narrative-pool" position={[x+(creek?.5:-.7),y+(creek?2.5:1.8),z]} color="#b5cce2"
      intensity={state.pool*9} distance={creek?6.5:4.9} decay={2} />
    {!reduced && <pointLight position={[guideX,moonV2Height(guideX,guideZ)+1.25,guideZ]} color="#c0d0de" intensity={state.guideLight} distance={4.6} decay={2} />}
    {state.veil>.005 && <mesh ref={veil} position={[x,y+1.75,z]} renderOrder={3}>
      <planeGeometry args={creek?[14,3.5]:[9,3.5]} />
      <shaderMaterial transparent depthWrite={false} side={DoubleSide} uniforms={uniforms}
        vertexShader="varying vec2 localUv; void main(){localUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
        fragmentShader={`varying vec2 localUv; uniform float density; uniform vec3 tint; void main(){vec2 v=(localUv-.5)*2.;float shape=(1.-smoothstep(.12,1.,length(v)))*smoothstep(.12,.54,localUv.y);gl_FragColor=vec4(tint,density*shape);
#include <colorspace_fragment>
}`} />
    </mesh>}
  </>
}


function withSpatial(blueprint:WorldNarrativeBlueprint,spatial:SpatialExpression):WorldNarrativeBlueprint{
  const memory={overlook:'溪边远望',clearing:'林间停留',meeting:'树下相遇'}[spatial.memory]
  return {...blueprint,expression:{...blueprint.expression,spatial,
    composition:spatial.route==='stream'?'creek':'clearing',
    memory:blueprint.expression.locks.includes('memory')?blueprint.expression.memory:memory}}
}

function SpatialControls({spatial,acts,apply,lockMemory,lockComposition}:{
  spatial:SpatialExpression;acts:WorldNarrativeBlueprint['expression']['acts']
  apply:(patch:Partial<SpatialExpression>)=>void;lockMemory:boolean;lockComposition:boolean
}){
  function chooseMemory(memory:SpatialExpression['memory']){
    apply({memory,route:memory==='overlook'?'stream':'woods'})
  }
  return <fieldset className="moon-spatial-expression">
    <legend>空间表达蓝图 · v1</legend>
    <p>故事由你填写，请选择对应的空间。音乐根据候选转折和起音密度建议分界、展开速度与倾向。</p>
    <label>空间开阔度 <select value={spatial.opening} onChange={e=>apply({opening:e.target.value as SpatialExpression['opening']})}>
      <option value="narrow">狭窄林径</option><option value="valley">半开放溪谷</option><option value="open">开阔林地</option>
    </select></label>
    <label>探索路径 <select disabled={lockComposition||lockMemory} value={spatial.route} onChange={e=>chooseMemory(e.target.value==='stream'?'overlook':'clearing')}>
      <option value="stream">沿溪前进</option><option value="woods">穿林抵达</option><option disabled>分岔后汇合（暂不可用）</option>
    </select></label>
    <label>记忆地点 <select disabled={lockMemory} value={spatial.memory} onChange={e=>chooseMemory(e.target.value as SpatialExpression['memory'])}>
      <option value="overlook" disabled={lockComposition&&spatial.route!=='stream'}>溪边远望</option><option value="clearing" disabled={lockComposition&&spatial.route!=='woods'}>林间停留</option><option value="meeting" disabled={lockComposition&&spatial.route!=='woods'}>树下相遇</option>
    </select></label>
    <label>空间情绪 <select value={spatial.mood} onChange={e=>apply({mood:e.target.value as SpatialExpression['mood']})}>
      <option value="calm">宁静</option><option value="anticipation">期待</option><option value="reminiscence">怀念</option>
    </select></label>
    <label>揭示方式 <select value={spatial.reveal} onChange={e=>apply({reveal:e.target.value as SpatialExpression['reveal']})}>
      <option value="vista">远景显现</option><option value="trail">路径开放</option><option value="pool">记忆地点受光</option>
    </select></label>
    <label>空间展开速度 <input type="range" min={.8} max={1.25} step={.001} value={spatial.pace} onChange={e=>apply({pace:Number(e.target.value)})} /></label>
    <output data-spatial={JSON.stringify(spatial)}>分界 {(acts[1].startMs/1000).toFixed(2)} / {(acts[2].startMs/1000).toFixed(2)} 秒 · 展开 {spatial.pace.toFixed(3)}× · 响应 {spatial.response.toFixed(3)}×</output>
  </fieldset>
}

export default function MoonV2Lab({onClose, confirmed, initialDemo=false}:{onClose:()=>void;confirmed?:WorldNarrativeBlueprint;initialDemo?:boolean}) {
  const [routeView,setRouteView]=useState<number>()
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(()=>{
    const preference=matchMedia('(prefers-reduced-motion: reduce)')
    const update=()=>setReduced(preference.matches)
    preference.addEventListener('change',update)
    return ()=>preference.removeEventListener('change',update)
  },[])
  const [view,setView]=useState<keyof typeof labels>('entrance')
  const [composition,setComposition]=useState<Composition>(confirmed?.expression?.composition??'creek')
  const [timeline,setTimeline]=useState<SongFeatureTimeline>()
  const [blueprint,setBlueprint]=useState<WorldNarrativeBlueprint>()
  const [time,setTime]=useState(0)
  const [works,setWorks]=useState<unknown[]>([])
  const [workId,setWorkId]=useState<string>()
  const [name,setName]=useState('')
  const [story,setStory]=useState('')
  const [songIdentity,setSongIdentity]=useState<SongIdentity>()
  const [overrides,setOverrides]=useState<Record<string,ObjectOverride>>({})
  const [missingAssets,setMissingAssets]=useState(false)
  const [proposal,setProposal]=useState<SpatialExpression['memory']>('overlook')
  const [status,setStatus]=useState('')
  const [busy,setBusy]=useState(false)
  const [effects,setEffects]=useState(true)
  const request=useRef<AbortController|null>(null)
  const audio=useAudio()
  useEffect(()=>{
    try{setWorks(readMoonWorks(localStorage))}
    catch{setStatus('无法读取 V2 存档。原记录已保留。')}
  },[])
  const {currentTime,playing,seek}=audio
  const active=!!blueprint&&!!timeline
  const base=useMemo(()=>sessionBlueprint(sampleTimeline,composition),[composition])
  const selected=blueprint??base
  const plan=useMemo(()=>compileWorld({...selected,expression:{...selected.expression,theme:selected.expression.theme.trim()||'Moonlight'}},[],'moon-2'),[selected])
  const state=blueprint&&timeline?narrativeState(plan,blueprint,timeline,time):undefined
  const visual=effects?state:undefined
  const audioDuration=timeline?.durationMs??0
  const locked=selected.expression.locks.includes('composition')
  useEffect(()=>()=>request.current?.abort(),[])
  useEffect(()=>{
    let frame=0, last=0
    const tick=(now:number)=>{
      if(now-last>=45){last=now;setTime(currentTime()*1000)}
      frame=requestAnimationFrame(tick)
    }
    setTime(currentTime()*1000)
    if(playing)frame=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(frame)
  },[currentTime,playing])

  async function prepare(file:File,demo=false){
    request.current?.abort()
    const controller=new AbortController()
    request.current=controller
    setBusy(true);setStatus('正在本地分析歌曲…');setTimeline(undefined);if(!workId){setBlueprint(undefined);setSongIdentity(undefined)}setTime(0)
    audio.clearAudio()
    try{
      if(file.size>40*1024*1024||!file.type.startsWith('audio/'))throw Error('audio')
      const sha256=await fingerprint(file)
      controller.signal.throwIfAborted()
      if(workId&&songIdentity?.sha256!==sha256){
        setStatus('音频指纹不匹配。请选择创作时使用的原文件。')
        return
      }
      const measured=await analyzeSong(file,controller.signal)
      controller.signal.throwIfAborted()
      await audio.loadAudio(file,false,false)
      controller.signal.throwIfAborted()
      setSongIdentity(workId?songIdentity:{name:file.name,bytes:file.size,durationMs:measured.durationMs,sha256})
      setTimeline(measured)
      if(workId){setStatus('原歌曲已重新关联');return}
      if(demo){
        setBlueprint(withSpatial(sessionBlueprint(measured,composition),suggestSpatial(measured,composition==='creek'?'overlook':'clearing')));setOverrides({})
        setStatus('已加载离线演示 · 48 秒')
      }else setStatus('分析完成，确认蓝图后播放。')
    }catch{
      if(!controller.signal.aborted)setStatus('无法分析这首歌。请选择五分钟以内的本地音频。')
    }finally{
      if(!controller.signal.aborted)setBusy(false)
    }
  }
  const demoStarted=useRef(false)
  useEffect(()=>{
    if(initialDemo&&!demoStarted.current){demoStarted.current=true;void prepare(makeMoonDemo(),true)}
  },[])
  function activate(source?:WorldNarrativeBlueprint) {
    if(!timeline||workId)return
    if(source){
      try{
        const {durationMs,acts}=source.expression
        if(Math.abs(durationMs-timeline.durationMs)>1000 || acts.length!==3 ||
           acts[0].startMs!==0 || acts[2].endMs!==durationMs ||
           acts.some((act,i)=>!Number.isFinite(act.startMs)||!Number.isFinite(act.endMs)||act.endMs<=act.startMs||(i>0&&act.startMs!==acts[i-1].endMs))){
          setStatus('已确认蓝图的时码与当前歌曲不匹配，请选择原歌曲或确认本次蓝图。')
          return
        }
        compileWorld(source,[],'moon-2')
        setComposition(source.expression.composition)
        setBlueprint(source)
      }catch{
        setStatus('无法读取该蓝图，请在创作工具里重新确认。');return
      }
    }else{
      const spatial=suggestSpatial(timeline,proposal)
      const next=spatial.route==='stream'?'creek':'clearing'
      setComposition(next)
      setBlueprint(withSpatial(sessionBlueprint(timeline,next),spatial))
    }
    setStatus('蓝图已就绪')
  }
  function openWork(row:unknown){
    try{
      const saved=restoreMoonWork(row)
      request.current?.abort();audio.clearAudio();setBusy(false);setTimeline(undefined);setTime(0)
      setWorkId(saved.id);setName(saved.name);setStory(saved.story);setSongIdentity(saved.song)
      setBlueprint(saved.blueprint);setOverrides(saved.overrides);setComposition(saved.blueprint.expression.composition)
      setRouteView(undefined);setView('entrance')
      setStatus('已打开静态作品。请选择原歌曲以恢复音乐同步。')
    }catch(error){
      setStatus(error instanceof Error&&error.message==='version'?'当前版本无法读取该作品。原存档已保留。':'作品存档不完整或已损坏。原存档已保留。')
    }
  }
  function save(){
    if(!blueprint||!songIdentity||!name.trim())return
    const now=new Date().toISOString()
    try{
      const previous=works.find(row=>(row as Partial<MoonWork>|null)?.id===workId) as MoonWork|undefined
      const work:MoonWork={schemaVersion:1,id:workId??crypto.randomUUID(),name:name.trim(),story,
        createdAt:previous?.createdAt??now,updatedAt:now,terrain:'moon-2',narrativeVersion:1,
        song:songIdentity,blueprint:{...blueprint,expression:{...blueprint.expression,theme:blueprint.expression.theme.trim()}},compiled:plan,overrides}
      writeMoonWork(localStorage,work)
      setWorks(readMoonWorks(localStorage));setWorkId(work.id);setStatus('私人作品已保存')
    }catch{setStatus('保存失败。已有存档已保留。')}
  }
  function newWork(){
    request.current?.abort();audio.clearAudio()
    setWorkId(undefined);setBlueprint(undefined);setTimeline(undefined);setSongIdentity(undefined)
    setOverrides({});setName('');setStory('');setStatus('');setBusy(false);setTime(0);setComposition('creek');setView('entrance');setRouteView(undefined)
  }
  function applySpatial(patch:Partial<SpatialExpression>){
    if(!blueprint)return
    const current=blueprint.expression.spatial
    if(!current)return
    const next={...current,...patch}
    if(locked&&next.route!==current.route)return
    if(blueprint.expression.locks.includes('memory')&&next.memory!==current.memory)return
    try{
      const updated=withSpatial(blueprint,next)
      const candidate=compileWorld({...updated,expression:{...updated.expression,theme:updated.expression.theme.trim()||'Moonlight'}},[],'moon-2')
      const ids=new Set(candidate.placements.map(p=>p.id))
      if(Object.keys(overrides).some(id=>!ids.has(id))){
        setStatus('当前编辑绑定在已有苔石上。请先另存原作品，再用新的实验草案尝试这组构图。')
        return
      }
      setBlueprint(updated);setComposition(updated.expression.composition)
      if(patch.memory)setRouteView(candidate.path.nodes.length-1)
      setStatus('')
    }catch{setStatus('这组空间参数无法通过当前地形的路线避让检查。')}
  }
  function updateTheme(theme:string){
    if(blueprint)setBlueprint({...blueprint,expression:{...blueprint.expression,theme}})
  }
  function move(ms:number){
    seek(ms/1000)
    setTime(currentTime()*1000)
  }
  return <main className="moon-v2-lab">
    <p className="moon-quick-guide">先载入合成演示或选择本地歌曲 → 确认蓝图 → 点击播放。可切换「沿溪远望 / 林隙停留」对比空间，展开下方「想象与保存」继续创作。演示音由浏览器实时合成，不含第三方录音；本地歌曲不上传。</p>
    <div className="moon-v2-controls">
      <button onClick={onClose}>返回画廊</button>
      <h2>月光森林 V2</h2>
      {(Object.keys(labels) as (keyof typeof labels)[]).map(key=><button key={key} data-view={key} aria-pressed={routeView===undefined&&key===view}
        disabled={locked&&((key==='creek'&&composition!=='creek')||(key==='clearing'&&composition!=='clearing'))}
        onClick={()=>{
          const next=key==='creek'||key==='clearing'?key:composition
          if(blueprint?.expression.spatial&&next!==composition){
            setRouteView(undefined);setView(key)
            applySpatial({route:next==='creek'?'stream':'woods',memory:next==='creek'?'overlook':'clearing'})
            return
          }
          setComposition(next)
          if(blueprint&&next!==composition){setBlueprint({...blueprint,expression:{...blueprint.expression,composition:next}});setOverrides({})}
          setRouteView(undefined)
          setView(key)
        }}>{labels[key]}</button>)}
      <div role="group" aria-label="沿路探索">
        {plan.path.nodes.map((_,index)=><button key={index} type="button" data-route={index} aria-pressed={routeView===index} onClick={()=>setRouteView(index)}>{index===0?'起点':index===plan.path.nodes.length-1?'终点':`路标 ${index}`}</button>)}
      </div>
    </div>
    <div className="moon-v2-controls moon-narrative-controls">
      <label>本地歌曲 <input type="file" accept="audio/*" onChange={event=>{
        const file=event.currentTarget.files?.[0];event.currentTarget.value=''
        if(file)void prepare(file)
      }} /></label>
      <button disabled={busy} onClick={()=>void prepare(makeMoonDemo(),true)}>载入离线演示</button>
      {!workId&&<button disabled={busy} onClick={()=>void makeMoonPulseDemo().then(file=>prepare(file,true))}>载入脉冲实验音乐</button>}
      {timeline&&!active&&<><label>根据想象选择场景 <select value={proposal} onChange={event=>setProposal(event.target.value as typeof proposal)}><option value="overlook">沿溪远望</option><option value="clearing">林间停留</option><option value="meeting">树下相遇</option></select></label><button onClick={()=>activate()}>确认本次蓝图</button></>}
      {confirmed&&timeline&&!active&&<button onClick={()=>activate(confirmed)}>使用作品的已确认蓝图</button>}
      <button disabled={!active} onClick={()=>{if(!playing&&time>=audioDuration-80)move(0);void audio.toggleAudio()}}>{playing?'暂停':'播放'}</button>
      <button disabled={!active} onClick={()=>{move(0);if(!playing)void audio.toggleAudio()}}>从头重播</button>
      <button disabled={!active} onClick={()=>move(time-5000)}>后退 5 秒</button>
      <button disabled={!active} onClick={()=>move(time+5000)}>前进 5 秒</button>
      <input aria-label="叙事进度" key={audio.sourceVersion} type="range" min={0} max={audioDuration||1} step={10} value={Math.min(time,audioDuration)}
        disabled={!active} onChange={event=>move(Number(event.target.value))} />
      {active&&<label><input type="checkbox" checked={effects} onChange={event=>setEffects(event.target.checked)} />叙事效果</label>}
      <output data-stage={state?.stage??'static'} data-time={Math.round(time)} data-path={state?.path??1}>
        {state ? ({A:'未知',B:'回应',C:'发现'})[state.stage] : '静态预览'} · {(time/1000).toFixed(1)} 秒
      </output>
      {(audio.error||status)&&<span role="status">{audio.error||status}</span>}
    </div>
    <details className="moon-v2-controls moon-work-controls">
      <summary>想象与保存 · V2 私人作品</summary>
      <button onClick={newWork}>新建私人作品</button>
      {works.map((row,index)=>{
        const item=row as Partial<MoonWork>|null
        return <button key={index} onClick={()=>openWork(row)}>{typeof item?.name==='string'?item.name:'无法识别的作品 '+(index+1)}</button>
      })}
      {(!blueprint||blueprint.expression.spatial)&&<label>我的想象或故事 <textarea maxLength={1000} value={story} onChange={event=>setStory(event.target.value)} /></label>}
      {blueprint&&<>
        <label>作品名称 <input maxLength={80} value={name} onChange={event=>setName(event.target.value)} /></label>
        <label>世界主题 <input maxLength={100} value={blueprint.expression.theme} onChange={event=>updateTheme(event.target.value)} /></label>
        {!blueprint.expression.spatial&&<label>我的想象或故事 <textarea maxLength={1000} value={story} onChange={event=>setStory(event.target.value)} /></label>}
        {blueprint.expression.spatial&&<SpatialControls spatial={blueprint.expression.spatial} acts={blueprint.expression.acts} apply={applySpatial} lockMemory={blueprint.expression.locks.includes('memory')} lockComposition={locked} />}
        <button disabled={!songIdentity||!name.trim()||!blueprint.expression.theme.trim()} onClick={save}>保存私人作品</button>
        {workId&&!timeline&&<p>静态回访 · 原歌曲：{songIdentity?.name}。请选择本地原文件继续音乐叙事。</p>}
        <fieldset><legend>记忆地点物件</legend>
          {plan.placements.map((item,index)=>{
            const edit=overrides[item.id]??{turn:0,scale:1}
            return <div key={item.id} data-edit-id={item.id}>
              <label>苔石 {index+1} 朝向 <input type="range" min={-180} max={180} step={5} value={edit.turn}
                onChange={event=>setOverrides({...overrides,[item.id]:{...edit,turn:Number(event.target.value)}})} /></label>
              <label>苔石 {index+1} 大小 <input type="range" min={.5} max={1} step={.05} value={edit.scale}
                onChange={event=>setOverrides({...overrides,[item.id]:{...edit,scale:Number(event.target.value)}})} /></label>
            </div>
          })}
        </fieldset>
      </>}
      {missingAssets&&<p role={publicWeb?undefined:'alert'}>{publicWeb?'公开演示采用程序化景物；未包含公开授权待确认的模型。':'部分场景资源缺失，仍可查看地形、路径和存档。'}</p>}
    </details>
    <div className="moon-v2-scene"><Canvas frameloop="demand" dpr={1} camera={{fov:46,near:.14,far:115}} shadows>
      <color attach="background" args={['#344650']} /><fog attach="fog" args={['#344650',visual?.nearFog??12,visual?.farFog??54]} />
      <hemisphereLight args={['#bbd3df','#555e51',1.45]} />
      <directionalLight position={[-10,15,-17]} color="#d2e8f6" intensity={2.0} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-19} shadow-camera-right={19} shadow-camera-top={19} shadow-camera-bottom={-19} shadow-bias={-.0005} />
      <V2Land /><V2Water reflect={visual?.water} /><HorizonTrees />
      <V2Assets placements={plan.placements} overrides={overrides} onMissing={setMissingAssets} showMemory={!visual||reduced||visual.memory>.15} /><ForestFloor plan={plan} />
      <ComposedPreview result={plan} showStones={false} reveal={reduced&&visual?Math.max(.78,visual.path):visual?.path} memoryReveal={reduced&&visual?Math.max(.32,visual.memory):visual?.memory} />
      {routeView===undefined ? <FixedCamera pose={views[view]} /> : <PreviewView result={plan} view={routeView} />}
      {visual&&<MemoryAtmosphere plan={plan} state={visual} reduced={reduced}/>}
    </Canvas></div>
  </main>
}

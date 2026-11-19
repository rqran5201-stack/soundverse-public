import { validSpatial, type SpatialExpression } from './spatialExpression.ts'
import { creekClearance, moonV2Height, moonV2Trees } from './moonTerrainV2.ts'
import { moonCreekX, worldGroundHeight } from './terrain.ts'
import type { Seed } from '../storage'
import type { WorldNarrativeBlueprint } from './narrativeBlueprint.ts'

export type Point = { x: number; z: number }
export type PathPlan = { id: string; samples: (Point & { y: number; width: number })[]; nodes: number[] }
export type RegionPlan = { id: string; center: Point; radius: number; habitat: 'creek-overlook' | 'woodland-clearing'; story: string; lookAt: Point }
export type CompiledWorld = {
  version: 1; templateVersion: 'moon-1' | 'moon-2'; assetVersion: 'local-1'; revision: number
  theme: string; night: boolean; dream: number; path: PathPlan; memory: RegionPlan
  placements: { id: string; x: number; z: number; size: number }[]
  spatial?: SpatialExpression
  digest: string
}

const creekRoute = [[3.4,10.4],[1.5,7],[.9,3.5],[2.1,1.1],[3.55,-2.15],[2.15,-6.3],[1.2,-12.4]]
const clearingRoute = [[3.4,10.4],[.4,8.8],[-2.5,6.5],[-4.2,3.8],[-6.4,.9],[-10.75,-1.6],[-11.1,-6.5]]
const publicObstacles = [
  [0,-2.2,2.8],[-1.9,2.5,1.35],[-6,-5,1.4],[-9,3,1.4],[-9,-12,1.8],[-5,-17,1.4],
  [-3.6,3.4,.8],[-3.4,2.8,.75],[3.6,2.1,.7],[-4.8,1,.9],[-5,-2,.9],[-7,-6,.9],[-8,-7,1.6],[-9,-3,1],[-8,-5,.8],[-12,-10,1.4],[-10,-10,.8],
]
export type MoonTerrainVersion = 'moon-1' | 'moon-2'

export function compileWorld(blueprint: WorldNarrativeBlueprint, seeds: Seed[], terrain: MoonTerrainVersion = 'moon-1'): CompiledWorld {
  const e = blueprint?.expression
  if (blueprint?.schemaVersion !== 1 || blueprint.worldId !== 'moon' || blueprint.mode !== 'interpret'
    || !Number.isSafeInteger(blueprint.revision) || blueprint.revision < 1 || e?.ruleVersion !== 1
    || !Number.isSafeInteger(e.seed) || !['creek','clearing'].includes(e.composition)
    || typeof e.theme !== 'string' || !e.theme.trim() || typeof e.memory !== 'string' || !e.memory.trim()
    || !Array.isArray(e.locks) || !Number.isFinite(e.dream) || e.dream < 0 || e.dream > 100) {
    throw Error('蓝图不完整，无法预览。')
  }
  const spatial=e.spatial
  if(spatial && (terrain!=='moon-2'||!validSpatial(spatial)||(spatial.route==='stream')!==(e.composition==='creek')))throw Error('Invalid spatial expression')
  const creek = e.composition === 'creek'
  const v2 = terrain === 'moon-2'
  const height = v2 ? moonV2Height : (x:number,z:number) => worldGroundHeight('moon',x,z)
  const meeting=spatial?.memory==='meeting'
  const route = meeting ? [...clearingRoute.slice(0,-2),[-9.6,.4],[-11.3,-2.85]] : v2 && creek ? [[3.4,10.4],[1.8,7],[1.9,3.5],[3.2,1.1],[3.45,-2.15],[2.2,-6.3],[1.2,-12.4]] : creek ? creekRoute : clearingRoute
  const occupied = [...(v2 ? moonV2Trees.map(([x,z,,radius])=>[x,z,radius]) : publicObstacles),...seeds.filter(seed=>seed.worldId==='moon').map(seed=>[
    seed.x,seed.z, (seed.kind==='tree' || !seed.kind ? 1.25 : .65) * (seed.size??1),
  ])]
  const clear = (x:number,z:number,r:number) =>
    height(x,z) > .15 && (v2 ? creekClearance(x,z) >= r+.5 : Math.abs(x-moonCreekX(z)) >= 1.8+r)
    && occupied.every(([ox,oz,or])=>Math.hypot(x-ox,z-oz)>=r+or)
  const safe = (x:number,z:number,r:number) =>
    clear(x,z,r) && Math.max(
      Math.abs(height(x+r,z)-height(x-r,z)),
      Math.abs(height(x,z+r)-height(x,z-r)),
    ) <= r*.85
  const precise = (value:number) => spatial ? Math.round(value*1e6)/1e6 : value
  const widthFactor=spatial?.opening==='narrow'?.85:spatial?.opening==='open'?1.22:1
  const points = [0,-.65,.65,-1.2,1.2,-1.8,1.8].map(offset=>{
    const controls = route.map(([x,z],index)=>({x:x+offset*Math.sin(Math.PI*index/(route.length-1)),z}))
    return controls.slice(0,-1).flatMap((a,i)=>{
      const b=controls[i+1],p=controls[Math.max(0,i-1)],q=controls[Math.min(controls.length-1,i+2)]
      return Array.from({length:24+(i===controls.length-2?1:0)},(_,j)=>{
        const t=j/24
        const interpolate=(k:'x'|'z')=>a[k]+.5*t*(b[k]-p[k]+t*(2*p[k]-5*a[k]+4*b[k]-q[k]+t*(3*a[k]-p[k]-3*b[k]+q[k])))
        const x=interpolate('x'),z=interpolate('z')
        return {x:precise(x),z:precise(z),y:precise(height(x,z)),width:precise((.55+.11*Math.sin(i+t+e.seed*.01))*widthFactor)}
      })
    })
  }).find(samples=>samples.every(({x,z,width})=>safe(x,z,width*1.11)))
  const end=points?.at(-1)
  if(!points || !end || !safe(end.x,end.z,1.35)) throw Error('入口、林径或记忆地点被占用。请保留现有作品并调整构图或腾出空间。')
  const id=(v2 ? 'moon-v2-' : 'moon-')+e.composition+(meeting?'-meeting':'')
  const cluster=spatial?.mood==='reminiscence'?1.04:spatial?.mood==='anticipation'?1.12:1
  const placements=[[-1.55,.15,.48],[1.65,-.65,.65],[-1,-1.38,.38]].flatMap(([dx,dz,size],index)=>{
    const x=end.x+dx*cluster,z=end.z+dz*cluster
    return safe(x,z,size) && points.every(point=>Math.hypot(x-point.x,z-point.z)>point.width+size)
      ? [{id:id+'-stone-'+index,x,z,size}] : []
  })
  const memory:RegionPlan={id:id+'-memory',center:{x:end.x,z:end.z},radius:1.35,story:e.memory,
    habitat:creek?'creek-overlook':'woodland-clearing',lookAt:creek?{x:5.4,z:-20}:meeting?{x:-13.9,z:-4.8}:{x:-12.2,z:-8.8}}
  const path:PathPlan={id:id+'-path',samples:points,nodes:[0,36,72,108,points.length-1]}
  const output={version:1,templateVersion:terrain,assetVersion:'local-1',revision:blueprint.revision,
    theme:e.theme,night:e.locks.includes('night'),dream:e.dream,path,memory,placements,...(spatial?{spatial}:{})} as const
  const digest=JSON.stringify(output).split('').reduce((hash,ch)=>Math.imul(hash^ch.charCodeAt(0),16777619),2166136261)
  return {...output,digest:(digest>>>0).toString(16).padStart(8,'0')}
}

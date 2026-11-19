import { worldGroundHeight, moonCreekX, fieldPathX } from './terrain.ts'
import type { AudioSignals } from '../audio/signals'
import type { Seed, WorldId } from '../storage'
export const GARDEN_LIMIT = 12
export type TerrainMotif = 'foundation' | 'grove' | 'canopy'
export type MusicEvent = { motif?: TerrainMotif; band: 'low'|'mid'|'high'; seconds: number; sequence: number }
export function readMusicEvent(value:unknown):MusicEvent|undefined {
  if(!value||typeof value!=='object')return
  const e=value as Record<string,unknown>
  if(!['low','mid','high'].includes(String(e.band))||typeof e.seconds!=='number'||!Number.isFinite(e.seconds)||e.seconds<0||typeof e.sequence!=='number'||!Number.isInteger(e.sequence)||e.sequence<1||e.sequence>GARDEN_LIMIT)return
  const motif = e.motif === 'foundation' || e.motif === 'grove' || e.motif === 'canopy' ? e.motif : undefined
  return {...(motif ? { motif } : {}),band:e.band as MusicEvent['band'],seconds:e.seconds,sequence:e.sequence}
}
const safe=(v:number)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):0
/** Audible exposure triggers, not beat/BPM, emotion or verse/chorus recognition. */
export class GardenConductor {
  seconds=0
  private gap=0
  private charge=0
  private bands={low:0,mid:0,high:0}
  step(audio:AudioSignals, seconds:number):Omit<MusicEvent,'sequence'>|null {
    if(!audio.active||!Number.isFinite(audio.level)||audio.level<.04)return null
    const dt=Number.isFinite(seconds)?Math.max(0,Math.min(.25,seconds)):0
    this.seconds+=dt;this.gap+=dt
    this.charge+=dt*(safe(audio.level)*.35+Math.max(safe(audio.low),safe(audio.mid),safe(audio.high))*.45+safe(audio.onset)*.2)
    for(const band of ['low','mid','high'] as const)this.bands[band]+=safe(audio[band])*dt
    if(this.gap<6||this.charge<1.6)return null
    const band=(['low','mid','high'] as const).reduce((a,b)=>this.bands[a]>=this.bands[b]?a:b)
    this.gap=0;this.charge=0;this.bands={low:0,mid:0,high:0}
    return {band,seconds:Math.round(this.seconds*10)/10}
  }
}
// Interleave foreground, opposite banks and distant pockets in discovery order.
const landscapeSites: Record<WorldId, readonly (readonly [number, number])[]> = {
  sea: [[3,5],[-7,-5],[4,-12],[-9,9],[-13,-13],[4,13],[-6,-17],[-16,5],[-3,11],[-18,-9],[1,-15],[-12,14],[-16,-17],[-20,0]],
  moon: [[1,6],[11,-5],[-6,-12],[12,7],[-9,2],[11,-15],[-2,-17],[15,-9],[2,-7],[-12,9],[14,12],[-9,-17],[2,-22],[15,-19]],
  field: [[-5,5],[2,-5],[-7,-13],[3,9],[-10,0],[-1,-18],[-10,-19],[-6,12],[-13,-7],[3,-12],[-10,13],[-3,-23],[-15,5],[-15,-16]],
}

function landscapeSite(worldId: WorldId, seeds: Seed[]) {
  return landscapeSites[worldId].find(([x,z]) =>
    worldGroundHeight(worldId,x,z) > .15
    && (worldId !== 'moon' || Math.abs(x - moonCreekX(z)) >= 3)
    && (worldId !== 'field' || Math.abs(x - fieldPathX(z)) >= 1.7)
    && seeds.every(seed => Math.hypot(seed.x - x, seed.z - z) >= 2.8))
}

export function gardenSeed(worldId:WorldId,seeds:Seed[],event:Omit<MusicEvent,'sequence'>,id:string):Seed|null {
  const local=seeds.filter(s=>s.worldId===worldId),count=local.filter(s=>s.source==='music').length
  if(count>=GARDEN_LIMIT)return null
  if (event.motif) {
    const site = landscapeSite(worldId, local)
    if (!site) return null
    const [x,z] = site
    const kind = event.motif === 'grove' ? 'tree' : 'flower'
    const names = { foundation: '岩台', grove: '树木', canopy: '花簇' }
    return {id,worldId,x,z,kind,growth:.12,source:'music',music:{...event,sequence:count+1},wish:names[event.motif]}
  }
  for(let attempt=0;attempt<80;attempt++) {
    const index=count*7+attempt,angle=index*2.399963+(worldId==='moon'?.4:worldId==='field'?1:0)
    const radius=1.2+Math.sqrt((index%23)/23)*2.2,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius
    if(local.some(s=>Math.hypot(s.x-x,s.z-z)<.65))continue
    // Keep the public focal tree and foreground original mushroom clear.
    if(worldId==='moon'&&(Math.hypot(x,z+2.2)<1.1||Math.hypot(x+1.9,z-2.5)<.85))continue
    const kind=event.motif==='grove'?'tree':worldId==='moon'&&event.band==='low'?'mushroom':'flower'
    const labels={low:'低频',mid:'中频',high:'高频'}
    return {id,worldId,x,z,kind,growth:.12,source:'music',music:{...event,sequence:count+1},wish:`音乐花园 · ${labels[event.band]}能量带来${kind==='mushroom'?'一簇蘑菇':'一丛花'}`}
  }
  return null
}

// Compare consecutive audible windows rather than adding scenery on a timer.
export class LandscapeConductor {
  private seconds = 0
  private window = 0
  private low = 0
  private mid = 0
  private high = 0
  private last: { band: MusicEvent['band']; brightness: number } | undefined

  step(audio: AudioSignals, dt: number): Omit<MusicEvent, 'sequence'> | null {
    if (!audio.active || audio.level < .04 || !Number.isFinite(dt) || dt <= 0) return null
    dt = Math.min(dt, .25)
    this.seconds += dt
    this.window += dt
    this.low += safe(audio.low) * dt
    this.mid += safe(audio.mid) * dt
    this.high += safe(audio.high) * dt
    if (this.window < 4) return null
    const bands = { low: this.low, mid: this.mid, high: this.high }
    const total = this.low + this.mid + this.high
    this.window = this.low = this.mid = this.high = 0
    if (total < .12) return null
    const band = (Object.keys(bands) as MusicEvent['band'][]).reduce((a,b) => bands[a] >= bands[b] ? a : b)
    const brightness = (bands.mid * .5 + bands.high) / total
    if (this.last && this.last.band === band && Math.abs(this.last.brightness - brightness) < .23) return null
    this.last = { band, brightness }
    const motif = { low: 'foundation', mid: 'grove', high: 'canopy' } as const
    return { band, motif: motif[band], seconds: Math.round(this.seconds * 10) / 10 }
  }
}

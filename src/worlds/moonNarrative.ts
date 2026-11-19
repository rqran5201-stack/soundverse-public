import type { SongFeatureTimeline } from '../audio/songFeatures.ts'
import type { WorldNarrativeBlueprint } from './narrativeBlueprint.ts'
import type { CompiledWorld } from './worldComposer.ts'

const clamp = (n: number) => Math.max(0, Math.min(1, n))
const ease = (n: number) => { const t=clamp(n); return t*t*(3-2*t) }

export function narrativeState(
  compiled: CompiledWorld, blueprint: WorldNarrativeBlueprint, timeline: SongFeatureTimeline, mediaMs: number,
) {
  const {acts,durationMs}=blueprint.expression
  const time=Math.min(durationMs,Math.max(0,Number.isFinite(mediaMs)?mediaMs:0))
  const first=acts[1].startMs, second=acts[2].startMs
  const spatial=blueprint.expression.spatial
  const pace=spatial?.pace??1
  const response=ease((time-first)/Math.max(1,(second-first)/pace))
  const discovery=ease((time-second)/Math.max(1,(durationMs-second)*.78/pace))
  const index=Math.min(timeline.windows.length-1,Math.floor(time/timeline.windowMs))
  const from=timeline.windows[index]?.energy??0, to=timeline.windows[index+1]?.energy??from
  const energy=clamp(from+(to-from)*((time%timeline.windowMs)/timeline.windowMs))
  const creek=compiled.memory.habitat==='creek-overlook'
  const emphasis=spatial?.reveal
  const responseStrength=spatial?.response??1
  return {
    stage: time>=second ? 'C' : time>=first ? 'B' : 'A',
    path: emphasis==='trail'?.36+.57*response+.07*discovery:.36+.51*response+.13*discovery,
    guide: .45+.38*response,
    guideLight: ease(response*4)*(1-ease(discovery*2))*8*responseStrength,
    veil: .60*(1-.66*response)*(1-discovery),
    memory: discovery,
    farFog: creek ? 29+12*response+(emphasis==='vista'?19:15)*discovery : 28+7*response+8*discovery,
    nearFog: 8+4*response+(creek?6:3)*discovery,
    water: .13+.38*response+(creek?.48:.16)*discovery+.035*energy,
    pool: discovery*(emphasis==='pool'?1.72:creek?1.12:1.55)+response*.18+energy*.035*response,
  } as const
}
export type MoonNarrativeState = ReturnType<typeof narrativeState>

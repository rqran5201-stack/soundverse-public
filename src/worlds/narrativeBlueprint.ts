import type { SpatialExpression } from './spatialExpression.ts'
import type { DecisionReason, SongFeatureTimeline } from '../audio/songFeatures.ts'

export type Strategy = 'nature' | 'memory' | 'story' | 'rhythm'
export type Composition = 'creek' | 'clearing'
export type UserConstraint = 'night' | 'ancient-tree' | 'composition' | 'memory'
type Act = { startMs: number; endMs: number; intent: string; change: string; decisionId: string }
export type ExpressionDraft = {
  ruleVersion: 1
  spatial?: SpatialExpression
  seed: number
  durationMs: number
  theme: string
  motifs: string[]
  strategies: Strategy[]
  composition: Composition
  memory: string
  dream: number
  locks: UserConstraint[]
  acts: [Act, Act, Act]
  decisions: Record<string, DecisionReason>
}
export type WorldNarrativeBlueprint = {
  schemaVersion: 1
  worldId: 'moon'
  mode: 'interpret'
  revision: number
  expression: ExpressionDraft
}

const layouts = {
  creek: ['沿溪寻光', '古树旁的望溪处', '溪岸薄雾', '苔蕨', '林隙光'],
  clearing: ['林隙停留', '林隙里可以停留的空地', '低雾', '蕨叶', '树影'],
} as const

export function proposeWorld(timeline: SongFeatureTimeline, composition: Composition, seed = 1, previous?: ExpressionDraft, storyTimes: readonly number[] = []): ExpressionDraft {
  const locks = previous?.locks ?? []
  if (locks.includes('composition') && previous) composition = previous.composition
  const [theme, memory, ...motifs] = layouts[composition]
  const durationMs = timeline.durationMs
  const energies = timeline.windows.map(window => window.energy).sort((a,b) => a-b)
  const low = energies[Math.floor(energies.length * .1)] ?? 0
  const range = (energies[Math.floor(energies.length * .9)] ?? 0) - low
  const relative = (energy: number) => Math.max(0, Math.min(1, (energy - low) / Math.max(.03, range)))
  const suggestions = timeline.windows.slice(1).map((window, index) => ({
    at: window.atMs + 500,
    score: range >= .03 ? Math.abs(relative(window.energy) - relative(timeline.windows[index].energy)) : 0,
  }))
  const boundaries = [.33,.67].map((fraction,index) => {
    const target = Math.round(durationMs*fraction)
    const candidates = [
      ...storyTimes.filter(Number.isSafeInteger).map(at => ({at,score:2})),
      ...timeline.candidates.map(cue => ({at:cue.atMs,score:1})),
      ...suggestions.filter(item=>item.score>=.3),
    ].filter(item => item.at >= durationMs*(index ? .53 : .16) && item.at <= durationMs*(index ? .86 : .48))
    const choice = candidates.sort((a,b)=>b.score-a.score || Math.abs(a.at-target)-Math.abs(b.at-target) || (seed % 2 ? a.at-b.at : b.at-a.at))[0]
    return {at: choice?.at ?? target, observed: !!choice, user: choice?.score === 2}
  })
  const [first, second] = boundaries
  const times = [0,first.at,second.at,durationMs]
  const scenes = composition === 'creek'
    ? [['从入口听见溪流','薄雾降低，露出干岸'],['沿溪向远处探索','苔蕨沿岸成带，林间路径逐步显现'],['在古树旁望向溪弯','光线落在终点，留出一块可停留的空地']]
    : [['在近处林隙停下','薄雾散开一小片空地'],['穿过两处远近错落的林隙','小径转入林中，植被在两侧形成斑块'],['抵达安静的林间空地','终点周边渐亮，中心留白']]
  return {
    ruleVersion:1,seed,durationMs,theme,motifs,composition,
    memory: locks.includes('memory') && previous ? previous.memory : memory,
    strategies:previous?.strategies ?? ['nature','story','rhythm'],
    dream:previous?.dream ?? 35, locks:[...locks],
    acts:scenes.map(([intent,change],i)=>({startMs:times[i],endMs:times[i+1],intent,change,decisionId:'act-'+i})) as ExpressionDraft['acts'],
    decisions:{
      composition:{source:'user',interpretation:'user-confirmed'},
      memory:{source:locks.includes('memory')?'user':'system',interpretation:locks.includes('memory')?'user-confirmed':'inferred'},
      'act-0':{source:'system',interpretation:'inferred'},
      'act-1':{source:first.user?'user':first.observed?'audio-observation':'system',inputSource:first.user?'user-story':first.observed?'audio-analysis':'system',interpretation:first.user?'user-confirmed':'inferred'},
      'act-2':{source:second.user?'user':second.observed?'audio-observation':'system',inputSource:second.user?'user-story':second.observed?'audio-analysis':'system',interpretation:second.user?'user-confirmed':'inferred'},
    },
  }
}

const key = (projectId: string) => 'soundverse-narrative-v1:' + projectId
export function readConfirmedBlueprint(projectId: string): WorldNarrativeBlueprint | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(key(projectId)) ?? 'null')
    return value?.schemaVersion === 1 && value.worldId === 'moon' && value.mode === 'interpret' ? value : undefined
  } catch { return undefined }
}

export function confirmWorld(projectId: string, expression: ExpressionDraft): WorldNarrativeBlueprint {
  const { acts, durationMs } = expression
  if (!expression.theme.trim() || !expression.memory.trim() || durationMs < 3 ||
    acts.some((act,i)=>!Number.isSafeInteger(act.startMs)||!Number.isSafeInteger(act.endMs)
      || act.startMs !== (i ? acts[i-1].endMs : 0) || act.endMs <= act.startMs || !act.intent.trim() || !act.change.trim())
    || acts[2].endMs !== durationMs) throw Error('请填写主题、记忆地点和三段变化，并保持时码连续。')
  const blueprint: WorldNarrativeBlueprint = {
    schemaVersion:1,worldId:'moon',mode:'interpret',
    revision:(readConfirmedBlueprint(projectId)?.revision ?? 0)+1,
    expression,
  }
  localStorage.setItem(key(projectId), JSON.stringify(blueprint))
  return blueprint
}

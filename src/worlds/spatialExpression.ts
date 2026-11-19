import type {SongFeatureTimeline} from '../audio/songFeatures.ts'

export type SpatialExpression={
  version:1
  opening:'narrow'|'valley'|'open'
  route:'stream'|'woods'
  memory:'overlook'|'clearing'|'meeting'
  mood:'calm'|'anticipation'|'reminiscence'
  reveal:'vista'|'trail'|'pool'
  pace:number
  response:number
}

export function suggestSpatial(timeline:SongFeatureTimeline, memory:SpatialExpression['memory']):SpatialExpression{
  const density=timeline.windows.reduce((sum,w)=>sum+w.onsetDensity,0)/Math.max(1,timeline.windows.length)
  const activity=Math.max(0,Math.min(1,density/4))
  return {
    version:1, opening:memory==='overlook'?'valley':'narrow',
    route:memory==='overlook'?'stream':'woods',memory,
    mood:activity>.42?'anticipation':'calm',
    reveal:memory==='overlook'?'vista':memory==='meeting'?'trail':'pool',
    pace:Number((.8+.45*activity).toFixed(3)),response:Number((.85+.3*activity).toFixed(3)),
  }
}

export function validSpatial(value:SpatialExpression){
  return value?.version===1 && ['narrow','valley','open'].includes(value.opening) &&
    ['stream','woods'].includes(value.route) && ['overlook','clearing','meeting'].includes(value.memory) &&
    (value.route==='stream')===(value.memory==='overlook') &&
    ['calm','anticipation','reminiscence'].includes(value.mood) && ['vista','trail','pool'].includes(value.reveal) &&
    Number.isFinite(value.pace)&&value.pace>=.8&&value.pace<=1.25 &&
    Number.isFinite(value.response)&&value.response>=.85&&value.response<=1.15
}

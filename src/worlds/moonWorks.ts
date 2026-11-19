import {compileWorld, type CompiledWorld} from './worldComposer.ts'
import type {WorldNarrativeBlueprint} from './narrativeBlueprint.ts'

export const moonWorksKey='soundverse-moon-v2-works-v1'
export type SongIdentity={name:string; bytes:number; durationMs:number; sha256:string}
export type ObjectOverride={turn:number; scale:number}
export type MoonWork={
  schemaVersion:1; id:string; name:string; createdAt:string; updatedAt:string
  terrain:'moon-2'; narrativeVersion:1; story:string; song:SongIdentity
  blueprint:WorldNarrativeBlueprint; compiled:CompiledWorld; overrides:Record<string,ObjectOverride>
}

export async function fingerprint(file: Blob){
  const bytes=await file.arrayBuffer()
  const hash=await crypto.subtle.digest('SHA-256',bytes)
  return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('')
}

export function readMoonWorks(storage:Pick<Storage,'getItem'>):unknown[]{
  const data:unknown=JSON.parse(storage.getItem(moonWorksKey)??'[]')
  if(!Array.isArray(data))throw Error('corrupt')
  return data
}

export function restoreMoonWork(input:unknown):MoonWork{
  if(!input || typeof input!=='object')throw Error('corrupt')
  const work=input as MoonWork
  if(work.schemaVersion!==1||work.terrain!=='moon-2'||work.narrativeVersion!==1||
     work.blueprint?.schemaVersion!==1||work.blueprint.expression?.ruleVersion!==1)throw Error('version')
  if(typeof work.id!=='string'||typeof work.name!=='string'||typeof work.story!=='string'||
     !Number.isFinite(Date.parse(work.createdAt))||!Number.isFinite(Date.parse(work.updatedAt))||
     !work.song||!/^[0-9a-f]{64}$/.test(work.song.sha256)||typeof work.song.name!=='string'||
     !Number.isSafeInteger(work.song.bytes)||work.song.bytes<=0||!Number.isSafeInteger(work.song.durationMs)||work.song.durationMs<=0||
     !work.overrides||typeof work.overrides!=='object'||Array.isArray(work.overrides))throw Error('corrupt')
  const {acts,durationMs}=work.blueprint.expression
  if(!Array.isArray(acts)||acts.length!==3||Math.abs(durationMs-work.song.durationMs)>1000||
     acts.some((act,i)=>!Number.isSafeInteger(act.startMs)||!Number.isSafeInteger(act.endMs)||
       act.startMs!==(i?acts[i-1].endMs:0)||act.endMs<=act.startMs)||acts[2].endMs!==durationMs)throw Error('corrupt')
  let compiled:CompiledWorld
  try{compiled=compileWorld(work.blueprint,[],'moon-2')}catch{throw Error('corrupt')}
  if(work.compiled?.templateVersion!=='moon-2'||work.compiled.assetVersion!==compiled.assetVersion)throw Error('version')
  if(compiled.digest!==work.compiled.digest)throw Error('corrupt')
  for(const [id,edit] of Object.entries(work.overrides)){
    if(!compiled.placements.some(p=>p.id===id)||!edit||
       !Number.isFinite(edit.turn)||Math.abs(edit.turn)>180||
       !Number.isFinite(edit.scale)||edit.scale<.5||edit.scale>1)throw Error('corrupt')
  }
  return {...work,compiled}
}

export function writeMoonWork(storage:Pick<Storage,'getItem'|'setItem'>,work:MoonWork){
  restoreMoonWork(work)
  const current=readMoonWorks(storage)
  const next=[work,...current.filter(row=>!row||typeof row!=='object'||!('id' in row)||row.id!==work.id)]
  storage.setItem(moonWorksKey,JSON.stringify(next))
}

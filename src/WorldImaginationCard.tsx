import { useState } from 'react'
import type { NarrativeCue, SongFeatureTimeline } from './audio/songFeatures'
import { confirmWorld, proposeWorld, readConfirmedBlueprint, type Composition, type ExpressionDraft, type Strategy, type UserConstraint } from './worlds/narrativeBlueprint'

const strategies: Record<Strategy,string> = {nature:'自然景观',memory:'记忆',story:'故事',rhythm:'音律'}
const locks: Record<UserConstraint,string> = {night:'夜色','ancient-tree':'古树',composition:'主要构图',memory:'记忆地点'}
const reasons = { user:'用户指定', system:'系统建议', 'audio-observation':'依据音频变化建议', 'lyric-explicit':'歌词字面', 'lyric-interpretation':'歌词解释' }

export default function WorldImaginationCard({projectId,timeline,stories,lyricCount,onAnalyze,canAnalyze,onPreview}: {
  projectId:string; timeline?:SongFeatureTimeline; stories:NarrativeCue[]; lyricCount:number; onAnalyze:()=>void; canAnalyze:boolean; onPreview?:()=>void
}) {
  const [composition,setComposition]=useState<Composition>('creek')
  const [draft,setDraft]=useState<ExpressionDraft>()
  const [confirmed,setConfirmed]=useState(()=>readConfirmedBlueprint(projectId))
  const [error,setError]=useState('')
  function propose() {
    if(!timeline){ onAnalyze(); return }
    setError('')
    const previous=draft ?? confirmed?.expression
    setDraft(proposeWorld(timeline,composition,previous?.seed ?? 1,previous,stories.map(cue=>cue.atMs)))
  }
  const layout=draft?.composition ?? composition
  const edit=(patch:Partial<ExpressionDraft>)=>setDraft(current=>current&&({...current,...patch}))
  function setBoundary(index:number,value:number){
    if(!draft)return
    edit({acts:draft.acts.map((act,i)=>({
      ...act,startMs:i===index+1?value:act.startMs,endMs:i===index?value:act.endMs,
    })) as ExpressionDraft['acts'],decisions:{...draft.decisions,['act-'+(index+1)]:{source:'user',interpretation:'user-confirmed'}}})
  }
  return <section className="imagination-card" aria-label="世界想象卡">
    <h3>世界想象卡</h3>
    <p>想象这首歌在月光森林里，会带你走到哪里。</p>
    {!!lyricCount && <p>已导入 {lyricCount} 条歌词标记，尚未解释。可参考原文，自行填写意象摘要。</p>}
    {!!stories.length && <details><summary>参考我写的故事</summary>
      {stories.map((cue,i)=><p key={i}>{cue.atMs} ms · {cue.text}</p>)}
      <p>请先选择贴合故事的构图，再用自己的话填写意象和记忆地点。</p>
    </details>}
    <label>空间构图<select value={layout} disabled={draft?.locks.includes('composition')} onChange={event=>{
      const next=event.target.value as Composition
      setComposition(next)
      if(draft && timeline) {
        const proposal=proposeWorld(timeline,next,draft.seed,draft,stories.map(cue=>cue.atMs))
        setDraft({...draft,composition:next,acts:proposal.acts,decisions:proposal.decisions,memory:draft.locks.includes('memory')?draft.memory:proposal.memory})
      }
    }}><option value="creek">沿溪远望</option><option value="clearing">林隙停留</option></select></label>
    <button type="button" className="upload" disabled={!timeline&&!canAnalyze} onClick={propose}>
      {draft?'重新起草':timeline?'构思我的世界':'先分析当前歌曲'}
    </button>
    {draft && <>
      <figure className="imagination-map" data-layout={layout} aria-label={layout==='creek'?'沿溪远望构图':'林隙停留构图'}>
        <span className="imagination-creek"/><span className="imagination-route"/>
        <span className="imagination-entry">入口</span><span className="imagination-tree">古树</span>
        <span className="imagination-memory">记忆地点</span>
      </figure>
      <label>世界主题<input maxLength={80} value={draft.theme} onChange={e=>edit({theme:e.target.value})}/></label>
      <fieldset><legend>核心意象（最多三个）</legend>
        {[0,1,2].map(i=><label key={i}>意象 {i+1}<input maxLength={40} value={draft.motifs[i]??''} onChange={e=>{
          const motifs=[...draft.motifs];motifs[i]=e.target.value;edit({motifs})
        }}/></label>)}
      </fieldset>
      <fieldset><legend>表达策略</legend>{(Object.keys(strategies) as Strategy[]).map(id=>
        <label key={id}><input type="checkbox" checked={draft.strategies.includes(id)} onChange={e=>edit({
          strategies:e.target.checked?[...draft.strategies,id]:draft.strategies.filter(item=>item!==id),
        })}/>{strategies[id]}</label>)}</fieldset>
      <label>记忆地点<input maxLength={120} disabled={draft.locks.includes('memory')} value={draft.memory} onChange={e=>edit({
        memory:e.target.value,decisions:{...draft.decisions,memory:{source:'user',interpretation:'user-confirmed'}},
      })}/></label>
      <ol className="imagination-acts">{draft.acts.map((act,i)=><li key={i}>
        <strong>第 {i+1} 段 · {act.startMs}–{act.endMs} ms</strong>
        {i<2&&<label>结束时码（毫秒）<input type="number" min={act.startMs+1} max={draft.acts[i+1].endMs-1} value={Number.isFinite(act.endMs)?act.endMs:''}
         onChange={e=>setBoundary(i,e.target.valueAsNumber)}/></label>}
        {(['intent','change'] as const).map(field=><label key={field}>{field==='intent'?'场景意图':'预期变化'}
          <input maxLength={120} value={act[field]} onChange={e=>edit({
            acts:draft.acts.map((other,j)=>j===i?{...other,[field]:e.target.value}:other) as ExpressionDraft['acts'],
            decisions:{...draft.decisions,[act.decisionId]:{source:'user',interpretation:'user-confirmed'}},
          })}/></label>)}
        <small>{reasons[draft.decisions[act.decisionId].source]} · {draft.decisions[act.decisionId].interpretation==='inferred'?'待确认的安排':'已指定'}</small>
      </li>)}</ol>
      <label>写实／梦境 <output>{draft.dream}</output><input type="range" min="0" max="100" value={draft.dream} onChange={e=>edit({dream:e.target.valueAsNumber})}/></label>
      <p>以后用于调整雾的色调、局部发光和光线过渡的幅度。</p>
      <fieldset><legend>重新起草时保留</legend>{(Object.keys(locks) as UserConstraint[]).map(id=>
        <label key={id}><input type="checkbox" checked={draft.locks.includes(id)} onChange={e=>edit({
          locks:e.target.checked?[...draft.locks,id]:draft.locks.filter(item=>item!==id),
        })}/>{locks[id]}</label>)}</fieldset>
      <details><summary>为什么这样设计</summary>
        <p>构图 · {reasons[draft.decisions.composition.source]}。记忆地点 · {reasons[draft.decisions.memory.source]}。</p>
        <p>时间建议参考曲内相对能量变化和候选转折。变化不明显时均分三段。</p>
      </details>
      <button type="button" className="primary" onClick={()=>{
        try {setConfirmed(confirmWorld(projectId,{...draft,motifs:draft.motifs.map(value=>value.trim()).filter(Boolean)}));setDraft(undefined);setError('')}
        catch(e){setError(e instanceof Error?e.message:'无法保存蓝图')}
      }}>确认世界蓝图</button>
      <button type="button" className="upload" onClick={()=>{setDraft(undefined);setError('')}}>取消草稿</button>
    </>}
    {error&&<p role="alert">{error}</p>}
    {confirmed&&<p role="status">世界蓝图已确认，等待空间生成 · {confirmed.expression.theme} · 第 {confirmed.revision} 版</p>}
    {confirmed && <button className="upload" type="button" onClick={onPreview}>{'\u9884\u89c8\u4e16\u754c\u6784\u56fe'}</button>}
  </section>
}

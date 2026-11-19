import { compileWorld, type CompiledWorld } from './worlds/worldComposer'
import { readConfirmedBlueprint } from './worlds/narrativeBlueprint'
import SongAnalysis from './SongAnalysis'
import { analyzeMoonSong, type GrowthStage } from './worlds/moonGrowth'
import { makeMoonDemo, moonDemoSection, MOON_DEMO_DURATION } from './worlds/moonDemo'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, AudioLines, Flower2, Leaf, Music2, Pause, Play, Plus, Search, Sparkles, Volume2 } from 'lucide-react'
import Scene from './Scene'
import type { HeroQuality } from './scene/useHeroQuality'
import { useLuxAsset } from './useLuxAsset'
import { readSeeds, STORAGE_KEY, readProjects, PROJECTS_KEY, defaultProjectId, seedProjectId, type Project, type Seed } from './storage'
import { useAudio } from './useAudio'
import { useLuxGeneration } from './useLuxGeneration'
import { WORLD_DEFINITIONS } from './worlds/definitions'
import { WORLD_CATALOG } from './worlds/catalog'
import WishGeneration from './WishGeneration'
import ObjectEditor from './ObjectEditor'
import { useSceneEditor } from './useSceneEditor'
import { useMusicGrowth } from './useMusicGrowth'
import { useMusicGarden } from './useMusicGarden'
import { gardenSeed, GARDEN_LIMIT, type MusicEvent } from './worlds/musicGarden'
import { growthValue, growthStage, suggestWishKind, KIND_LABELS, type SeedKind } from './worlds/growth'

const MoonV2Lab = lazy(() => import('./scene/MoonV2Lab'))
const songs = WORLD_CATALOG
type Song = typeof songs[number]
const EMPTY_SEEDS: Seed[] = []
export default function App(){
 const [page,setPage]=useState<'discover'|'studio'|'mine'|'moon-v2'>('discover')
 const [song,setSong]=useState<Song>(songs[0])
 const [labDemo,setLabDemo]=useState(false)
 const [query,setQuery]=useState('')
 const [heroQuality,setHeroQuality]=useState<HeroQuality>('auto')
 const [seeds,setSeeds]=useState<Seed[]>(readSeeds)
 const [projects,setProjects]=useState(readProjects)
 const [selectedProject,setSelectedProject]=useState<string | null>(null)
 const [projectName,setProjectName]=useState('')
 const projectId=selectedProject ?? defaultProjectId(song.id)
 const activeProject=projects.find(project=>project.id===projectId)
 const currentSeeds=useMemo(()=>seeds.filter(seed=>seedProjectId(seed)===projectId),[seeds,projectId])
 const attachJob=useCallback((seedId:string,jobId:string)=>setSeeds(previous=>previous.map(seed=>seed.id===seedId?{...seed,luxJobId:jobId,luxSubmissionUncertain:false}:seed)),[])
 const markSubmitting=useCallback((seedId:string,uncertain:boolean)=>setSeeds(previous=>previous.map(seed=>seed.id===seedId?{...seed,luxSubmissionUncertain:uncertain}:seed)),[])
 const generation=useLuxGeneration(seeds,attachJob,markSubmitting)
 const [wish,setWish]=useState('')
 const [wishKind,setWishKind]=useState<'auto'|SeedKind>('auto')
 const [musicGrowth,setMusicGrowth]=useState(false)
 const [gardenEnabled,setGardenEnabled]=useState(false)
 const selectedKind=wishKind==='auto'?suggestWishKind(wish):wishKind
 const [toolsOpen,setToolsOpen]=useState(false)
 const [worldMode,setWorldMode]=useState<'base'|'personal'>('base')
 const editor=useSceneEditor(seeds,setSeeds,projectId,page==='studio'&&worldMode==='personal'&&toolsOpen)
 const [demoActive,setDemoActive]=useState(false)
 const [demoTime,setDemoTime]=useState(0)
 const {currentTime,playing,audioName,sourceVersion,energy,levels,signals,error:audioError,loadAudio,toggleAudio,clearError}=useAudio()
 const [analysisFile,setAnalysisFile]=useState<File|null>(null)
 const [preview,setPreview]=useState<{projectId:string; result:CompiledWorld; view:number}>()
 const lastPreview=useRef(new Map<string,CompiledWorld>())
 const [labBlueprint,setLabBlueprint]=useState<ReturnType<typeof readConfirmedBlueprint>>()
 const [previewError,setPreviewError]=useState('')
 const activePreview=page==='studio'&&worldMode==='personal'&&song.id==='moon'&&preview?.projectId===projectId?preview:undefined
 function openComposition(){
  try {
   const blueprint=readConfirmedBlueprint(projectId)
   if(!blueprint)throw Error('No confirmed blueprint')
   const result=compileWorld(blueprint,currentSeeds)
   lastPreview.current.set(projectId,result)
   setPreview({projectId,result,view:0})
   setPreviewError('')
  } catch {
   const result=lastPreview.current.get(projectId)
   if(result)setPreview({projectId,result,view:0})
   setPreviewError(result?'\u7f16\u6392\u5931\u8d25\uff0c\u5df2\u6062\u590d\u4e0a\u6b21\u9884\u89c8\u3002':'\u7f16\u6392\u5931\u8d25\uff0c\u8bf7\u786e\u8ba4\u84dd\u56fe\u5e76\u68c0\u67e5\u8def\u7ebf\u4e0a\u7684\u7269\u4ef6\u3002')
  }
 }
 const [growthPlan,setGrowthPlan]=useState<GrowthStage[]>([])
 const [growthStatus,setGrowthStatus]=useState('')
 const [growthMode,setGrowthMode]=useState(false)
 const growthAnalysis=useRef<AbortController|null>(null)

 function resetGrowthPlan() {
  growthAnalysis.current?.abort()
  setGrowthPlan([])
  setGrowthStatus('')
 }

 function importSong(file: File) {
  setAnalysisFile(file)
  resetGrowthPlan()
  setDemoActive(false)
  void loadAudio(file)
  if (!growthMode || song.id !== 'moon' || page !== 'studio' || worldMode !== 'personal') return
  const controller=new AbortController()
  growthAnalysis.current=controller
  setGrowthStatus('Analyzing the complete track...')
  void analyzeMoonSong(file,projectId,controller.signal).then(plan=>{
   if(controller.signal.aborted)return
   setGrowthPlan(plan)
   setGrowthStatus(plan.length?'Track ready. Landscape grows as the song plays.':'No audible sections found.')
  }).catch(()=>{
   if(!controller.signal.aborted)setGrowthStatus('Analysis unavailable. Local playback remains available.')
  })
 }

 useEffect(()=>{
  if(!growthMode || !playing || page!=='studio' || worldMode!=='personal' || !growthPlan.length)return
  const timer=window.setInterval(()=>{
   if(document.visibilityState!=='visible')return
   const time=currentTime()
   const candidates=growthPlan.filter(stage=>stage.time<=time).flatMap(stage=>stage.objects)
   if(!candidates.length)return
   setSeeds(previous=>{
    const occupied=new Set(previous.map(seed=>seed.id))
    const additions=candidates.filter(seed=>!occupied.has(seed.id)
      && !previous.some(existing=>seedProjectId(existing)===projectId && Math.hypot(seed.x-existing.x,seed.z-existing.z)<.55)).slice(0,3)
    return additions.length?[...previous,...additions]:previous
   })
  },180)
  return ()=>clearInterval(timer)
 },[growthMode,playing,page,worldMode,growthPlan,currentTime,projectId])

 useEffect(()=>{
  if(!demoActive || !playing)return
  const timer=window.setInterval(()=>setDemoTime(currentTime()),200)
  return ()=>window.clearInterval(timer)
 },[demoActive,playing,currentTime])
 const demoSection=moonDemoSection(demoTime)
 function playMoonDemo(){
  setAnalysisFile(null)
  resetGrowthPlan()
  setDemoTime(0)
  setDemoActive(true)
  void loadAudio(makeMoonDemo(),false)
 }
 const advanceGrowth=useCallback((amount:number)=>setSeeds(previous=>{let changed=false;const next=previous.map(seed=>{if(seedProjectId(seed)!==projectId||growthValue(seed.growth)>=1)return seed;changed=true;return {...seed,growth:Math.min(1,growthValue(seed.growth)+amount)}});return changed?next:previous}),[projectId])
 useMusicGrowth(signals,page==='studio'&&worldMode==='personal'&&musicGrowth,advanceGrowth)
 const [landscapeMode,setLandscapeMode]=useState(false)
 const gardenCount=currentSeeds.filter(seed=>seed.source==='music').length
 const gardenHasSpace=useMemo(()=>!!gardenSeed(song.id,currentSeeds,{band:'mid',seconds:0,motif:landscapeMode?'grove':undefined},'probe'),[currentSeeds,song.id,landscapeMode])
 const onGardenEvent=useCallback((event:Omit<MusicEvent,'sequence'>)=>setSeeds(previous=>{const id=typeof crypto.randomUUID==='function'?crypto.randomUUID():String(Date.now()+Math.random());const next=gardenSeed(song.id,previous.filter(seed=>seedProjectId(seed)===projectId),event,id);return next?[...previous,{...next,projectId}]:previous}),[song.id,projectId])
 useMusicGarden(signals,page==='studio'&&worldMode==='personal'&&!growthMode&&gardenEnabled&&gardenCount<GARDEN_LIMIT&&gardenHasSpace,projectId+":"+sourceVersion,onGardenEvent,landscapeMode)
 const [useLux,setUseLux]=useState(false)
 const lux=useLuxAsset(page==='studio')
 const modelUploadRef=useRef<HTMLInputElement|null>(null)
 const [notice,setNotice]=useState('')
 const [saved,setSaved]=useState(true)
 const uploadRef=useRef<HTMLInputElement|null>(null)
 const storedSeeds=useRef(seeds)
 const storedProjects=useRef(projects)
 useEffect(()=>{
   try{
     if(storedProjects.current!==projects){
       localStorage.setItem(PROJECTS_KEY,JSON.stringify(projects))
       storedProjects.current=projects
     }
     if(storedSeeds.current!==seeds){
       localStorage.setItem(STORAGE_KEY,JSON.stringify(seeds))
       storedSeeds.current=seeds
     }
     setSaved(true)
   }catch{
     setSaved(false)
     setNotice('浏览器存储不可用，当前创作尚未保存。')
   }
 },[seeds,projects])
 function plant(){
  const value=wish.trim();if(!value)return
  const existing=currentSeeds.length
  const angle=existing*2.399963;const radius=1.25+Math.sqrt((existing%11)/11)*2.6
  const id=typeof crypto.randomUUID==='function'?crypto.randomUUID():String(Date.now()+Math.random())
  setWorldMode('personal');setSeeds(prev=>[...prev,{id,x:existing===0?-.6:Math.cos(angle)*radius,z:existing===0?2.65:Math.sin(angle)*radius,wish:value,worldId:song.id,projectId,kind:selectedKind,growth:.12}]);setWish('');setWishKind('auto')
 }
 const matches=songs.filter(s=>(s.name+s.english+s.mood+s.song).toLowerCase().includes(query.toLowerCase()))
 useEffect(()=>{if(page!=='studio')setAnalysisFile(null)},[page])
 function enter(s:Song, personal=false, id: string | null = null){setPreview(undefined);setPreviewError('');resetGrowthPlan();setGrowthMode(false);setDemoActive(false);setSelectedProject(id);setProjectName('');setWish('');setGardenEnabled(false);setLandscapeMode(false);setMusicGrowth(false);setSong(s);setPage('studio');setUseLux(false);setWorldMode(personal?'personal':'base');setToolsOpen(personal)}
 function startCreating(){setToolsOpen(true);setWorldMode('personal')}
 function createProject(){
  const name=projectName.trim()
  if(!name)return
  const id=typeof crypto.randomUUID==='function'?crypto.randomUUID():String(Date.now()+Math.random())
  setProjects(previous=>[...previous,{id,worldId:song.id,name}])
  enter(song,true,id)
 }
 const defaultProjects: Project[]=songs.map(world=>({id:defaultProjectId(world.id),worldId:world.id,name:world.name+' · 我的分支'}))
 const definition=WORLD_DEFINITIONS[song.id]
 const recentWorlds=useMemo(()=>{const history=seeds.filter(seed=>seedProjectId(seed)===defaultProjectId(seed.worldId)).map(s=>s.worldId);return songs.filter(s=>history.includes(s.id)).sort((a,b)=>history.lastIndexOf(b.id)-history.lastIndexOf(a.id))},[seeds])
 if(page==='moon-v2')return <Suspense fallback={<p>正在加载月光森林 V2…</p>}><MoonV2Lab initialDemo={labDemo} confirmed={labBlueprint} onClose={()=>setPage('discover')} /></Suspense>
 return <div className="app">
  <header className="topbar"><button className="brand" onClick={()=>setPage('discover')}><AudioLines size={23}/> SOUNDVERSE <span>alpha 0.1</span></button><nav><button aria-current={page==='discover'?'page':undefined} className={page==='discover'?'active':''} onClick={()=>setPage('discover')}>Discover</button><button aria-current={page==='mine'?'page':undefined} className={page==='mine'?'active':''} onClick={()=>setPage('mine')}>My Universe</button></nav></header>
  {page==='discover'?<main>
   <section className="hero"><div className="hero-world"><Scene presentation="hero" quality={heroQuality} audioSignals={signals}/><div className="hero-shade"/></div><div className="hero-content"><div className="eyebrow"><Sparkles size={15}/> MUSIC, MADE INTO A PLACE</div><h1>Every song<br/><em>opens a world.</em></h1><p>每一段旋律，<br/>都有一个等待你发现的世界。</p><label className="search"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="搜索世界" placeholder="寻找一首歌，开启一个世界……"/></label><div className="judge-entry"><button className="hero-cta" onClick={()=>{setLabDemo(true);setLabBlueprint(undefined);if(playing)void toggleAudio();setPage('moon-v2')}}>立即体验 <ArrowRight size={17}/></button><button className="judge-personal" onClick={()=>{setLabDemo(false);setLabBlueprint(undefined);if(playing)void toggleAudio();setPage('moon-v2')}}>用我的歌曲创作</button></div><small className="judge-caption">月光森林 V2 · 48 秒合成演示 · 无需上传歌曲</small></div><label className="hero-quality">画面<select aria-label="画面质量" value={heroQuality} onChange={e=>setHeroQuality(e.target.value as HeroQuality)}><option value="auto">自动</option><option value="high">细腻</option><option value="low">轻盈</option></select></label><div className="hero-location"><span>01 / THE SEA OF WIND</span><strong>风之海</strong><small>海风 · 星光树 · 未说出口的愿望</small></div><div className="hero-caption"><span className="live-dot"/> 随旋律呼吸，随心意生长</div></section>
   <section className="gallery"><div className="gallery-intro"><span>THE SOUNDSCAPE COLLECTION</span><p>听见一首歌，也走进一处风景。</p></div><div className="section-head"><div><div className="eyebrow dark">DISCOVER THE UNEXPECTED</div><h2>Explore Worlds</h2><p>一首歌，一种感受，一片等待你探索的风景。</p></div><span className="count">{matches.length} 个示例世界</span></div>
    <div className="cards">{matches.map(s=><button key={s.id} className={'world-card '+s.palette} onClick={()=>enter(s)}><div className="card-art"><img className="world-preview" src={s.preview} alt={`${s.name}场景预览`} loading="lazy"/><span className="preview-label">世界预览</span></div><div className="card-body"><span className="curation-label">策展示例 · {WORLD_DEFINITIONS[s.id].theme}</span><div className="card-title"><div><h3>{s.name}</h3><small>{s.english}</small></div><ArrowRight size={20}/></div><div className="song-line"><Music2 size={15}/>{s.song} · 音频由你选择</div><p>{s.desc}</p><span className="mood">{s.mood}</span></div></button>)}</div>{matches.length===0&&<p>暂无匹配的示例世界。真实歌曲目录将在后续版本接入。</p>}<button className="upload" onClick={()=>{setLabDemo(false);setLabBlueprint(undefined);if(playing)void toggleAudio();setPage('moon-v2')}}>预览月光森林 V2</button><p className="gallery-provenance">当前为策展示例，未接入真实歌曲目录和听众统计。</p></section>
   <section className="return-worlds"><div className="eyebrow dark">YOUR UNIVERSE</div><h2>有些世界，值得再回来。</h2><p>你留下的期待，保存在当前浏览器中。</p>{recentWorlds.length?<div className="return-grid">{recentWorlds.map(s=><button className="return-world" key={s.id} onClick={()=>enter(s,true)}><img src={s.preview} alt={`${s.name}基础世界预览`}/><span>继续创造</span><strong>{s.name}</strong><small>{seeds.filter(seed=>seed.worldId===s.id).length} 处生长 · 我的创作</small><ArrowRight size={18}/></button>)}</div>:<div className="return-empty"><p>这里等待着你的第一个世界。</p><span>先走进一处风景，听一会儿，再留下你的期待。</span></div>}</section>
  </main>:page==='studio'?<main className={'studio '+(toolsOpen?'is-creating':'is-listening')} data-mode={worldMode} data-world={song.id}><div className="studio-head"><button className="back" onClick={()=>setPage('discover')}><ArrowLeft size={16}/> 返回画廊</button><div><div className="eyebrow dark">YOUR LIVING WORLD</div><h2>{activeProject?.name ?? song.name} <span>{activeProject ? song.name : song.english}</span></h2></div><div className="studio-controls"><span className="world-source">{worldMode==='base'?'公共基底 · 策展示例':'私人创作 · 当前浏览器'}</span><button className="upload" onClick={()=>toolsOpen?setToolsOpen(false):startCreating()}>{toolsOpen?'收起创作工具':'开始创造'}</button>{worldMode==='personal'&&song.id==='moon'&&<button className="upload" onClick={()=>{setLabDemo(false);setLabBlueprint(readConfirmedBlueprint(projectId));if(playing)void toggleAudio();setPage('moon-v2')}}>在 V2 体验音乐叙事</button>}{worldMode==='base'&&<form className="project-create" onSubmit={event=>{event.preventDefault();createProject()}}><label>私人作品名称 <input value={projectName} maxLength={60} onChange={event=>setProjectName(event.target.value)}/></label><button className="upload" disabled={!projectName.trim()}>创建私人作品</button></form>}</div><span className="saved">{worldMode==='base'?'自由探索 · 音乐由你开启':saved?'自动保存 · 当前浏览器':'尚未保存 · 存储不可用'}</span></div>{activePreview && <section className="composition-preview" aria-label="Composition preview">
 <strong>{activePreview.result.theme} ? 构图预览</strong>
 <span>{activePreview.result.memory.story}</span>
 <button className="upload" onClick={()=>setPreview({...activePreview,view:0})}>入口</button>
 <button className="upload" onClick={()=>setPreview({...activePreview,view:-1})}>俯瞰</button>
 {activePreview.result.path.nodes.slice(1,-1).map((_,i)=><button key={i} className="upload" onClick={()=>setPreview({...activePreview,view:i+1})}>{i+1} ? 林径</button>)}
 <button className="upload" onClick={()=>setPreview({...activePreview,view:activePreview.result.path.nodes.length-1})}>记忆地点</button>
 <button className="upload" onClick={()=>{setPreview(undefined);setPreviewError('')}}>退出预览</button>
 </section>}{previewError&&<p role="alert">{previewError}</p>}<div className="studio-layout"><div className="studio-canvas"><Scene composedPreview={activePreview} audioSignals={signals} seeds={worldMode==='personal'?currentSeeds:EMPTY_SEEDS} asset={worldMode==='personal'&&useLux?lux.asset:null} generatedAssets={generation.assets} worldId={song.id} selectedId={editor.selectedId} placing={!activePreview&&editor.placing} onSelect={!activePreview&&worldMode==='personal'&&toolsOpen?editor.select:undefined} onPlace={editor.place}/><div className="scene-story"><span>{song.english.toUpperCase()} · {worldMode==='base'?'PUBLIC BASE WORLD':'YOUR OWN CHAPTER'}</span><p>{definition.story.split('\n')[0]}<br/><em>{definition.story.split('\n')[1]}</em></p></div><div className="scene-tag"><span className="live-dot"/> WORLD IS ALIVE</div><div className="scene-hint">{editor.placing?'点击浅色空地摆放 · Esc 取消':'拖动旋转 · 滚轮缩放'}</div></div><aside className="studio-side" hidden={!toolsOpen}><div className="eyebrow dark"><Leaf size={15}/> WORLD STUDIO</div><h3>{definition.invitation}</h3><p>写下期待，选择一种生命先种下。音乐可以让它逐渐舒展；Lux3D 可进一步生成独特造型。</p><textarea value={wish} onChange={e=>setWish(e.target.value)} maxLength={1000} aria-label="写下你的期待" placeholder={`我希望这里有${definition.defaultAsset}…`} rows={4}/><label className="wish-kind">先种下<select aria-label="期待物件类型" value={wishKind} onChange={e=>setWishKind(e.target.value as typeof wishKind)}><option value="auto">文字建议 · {KIND_LABELS[suggestWishKind(wish)]}</option><option value="flower">花朵</option><option value="mushroom">蘑菇</option><option value="tree">树木</option></select></label><small className="wish-explanation">按关键词建议，可手动更改；天气、极光和整片地形尚不支持。初始造型为程序化预览。</small><button className="primary" disabled={!wish.trim()} onClick={plant}><Plus size={18}/> 种下一份期待</button><p className="generation-hint">{generation.available?'种下愿望后可用 Lux3D 生成专属物件。生成将使用账号额度，不会自动重试。':'在线生成服务暂未开启，可先种下愿望或导入已有模型。'}</p><div className="growth-control"><label><input type="checkbox" aria-label="随音乐生长" checked={musicGrowth} onChange={e=>{setMusicGrowth(e.target.checked);if(!e.target.checked)setGardenEnabled(false)}}/> 随音乐生长</label><p>{musicGrowth?(playing?'音乐正在滋养你种下的生命。':'播放音乐后继续生长。'):'开启后，播放中的声音能量推动私人植被生长。'} 暂停或离开不倒退，不自动生成付费模型。</p></div>{worldMode==='personal' && toolsOpen && <SongAnalysis key={projectId+":"+sourceVersion} file={analysisFile} imaginationProject={song.id==='moon'?projectId:undefined} onPreview={openComposition}/>}<section className="music-garden">
 {song.id==='moon'&&<div>
  <label><input type="checkbox" checked={growthMode} onChange={event=>{
   const enabled=event.target.checked
   resetGrowthPlan();setGrowthMode(enabled)
   if(enabled){setGardenEnabled(false);setLandscapeMode(false);setMusicGrowth(true)}
  }}/> MUSIC WORLD 2.0</label>
  {growthMode&&<p role="status">{growthStatus || 'Select a local song to grow the whole landscape.'}</p>}
 </div>}
 <label><input type="checkbox" checked={landscapeMode} onChange={e=>{
  setLandscapeMode(e.target.checked);setGardenEnabled(e.target.checked)
  if(e.target.checked)setMusicGrowth(true)
 }}/>随歌曲创造地景</label>{song.id==='moon'&&<div className="moon-demo">
  <button className="upload" onClick={playMoonDemo}>播放月光森林演示</button>
  {demoActive&&<div><strong>{demoSection.name}</strong><p>{demoSection.description}</p>
  <progress aria-label="整曲播放进度" max={MOON_DEMO_DURATION} value={demoTime}/></div>}
 </div>}<label><input type="checkbox" aria-label="让音乐长出花园" checked={gardenEnabled} onChange={e=>{setLandscapeMode(false);setGardenEnabled(e.target.checked);if(e.target.checked)setMusicGrowth(true)}}/> 让音乐长出花园</label><p>{gardenCount>=GARDEN_LIMIT?'这处花园已长满，已停止新增，现有植被仍可培育。':!gardenHasSpace?'中央空地较满，先调整已有物件的位置再继续。':gardenEnabled?(playing?'正在聆听，声音能量积累后会长出新的生命。':'播放音乐后开始聆听。'):'开启后，声音能量会逐步带来花丛；月光森林中的低频会带来蘑菇。'}</p><small>已生长 {gardenCount} / {GARDEN_LIMIT} 组 · 至少间隔 6 秒 · 本地规则，不调用付费生成</small></section><details className="music-response"><summary>音乐如何影响世界</summary><p>低频推动水面，中频带动树木，高频唤起微光。暂停后，世界回到自然的风中。</p>{([["low","低频 · 水面"],["mid","中频 · 植物"],["high","高频 · 微光"]] as const).map(([band,label])=><label key={band}>{label}<meter aria-label={label} min={0} max={1} value={levels[band]}/></label>)}</details><ObjectEditor editor={editor}/><div className="separator"/><h4><Flower2 size={17}/> 已种下 · {currentSeeds.length}</h4><div className="wish-list">{currentSeeds.length?currentSeeds.map(s=><div className={'wish-item '+(editor.selectedId===s.id?'is-selected':'')} key={s.id}><span>✦</span><div className="wish-content"><span className="wish-text">{s.wish}</span>{s.source==='music'&&s.music&&<small className="music-event">声音留下的痕迹 · 聆听 {s.music.seconds.toFixed(1)} 秒 · {({low:'低频',mid:'中频',high:'高频'})[s.music.band]}能量</small>}<div className="wish-growth" data-kind={s.kind||'tree'}><span>{KIND_LABELS[s.kind||'tree']} · {growthStage(s.growth)}</span><progress aria-label={`${s.wish}生长进度`} max={1} value={growthValue(s.growth)}/><small>{Math.round(growthValue(s.growth)*100)}%</small></div><button className="edit-wish upload" aria-pressed={editor.selectedId===s.id} onClick={()=>editor.select(s.id)}>编辑物件</button><WishGeneration seed={s} generation={generation}/></div></div>):<p className="muted">这里还没有种下的期待。</p>}</div><details className="local-models"><summary>导入已有 3D 模型</summary><label className="lux-toggle"><input type="checkbox" checked={useLux} disabled={lux.status!=='ready'} onChange={e=>setUseLux(e.target.checked)}/> 使用 Lux3D GLB 模型</label><p className="model-status muted" role="status" aria-live="polite" data-state={lux.status}>{lux.message}</p><input ref={modelUploadRef} type="file" accept=".glb" hidden aria-label="选择 Lux3D GLB" onChange={e=>{const file=e.target.files?.[0];if(file){setUseLux(true);void lux.load(file)}e.target.value=''}}/><div className="model-actions"><button className="upload" onClick={()=>modelUploadRef.current?.click()}>导入 Lux3D GLB</button><button className="upload" disabled={lux.status==='loading'} onClick={()=>void lux.load()}>重新检测</button></div><small className="muted">仅导入你有权使用的模型。本地文件不上传，刷新后需重新导入。音乐花园不会批量替换成此模型。</small></details></aside></div></main>
  :<main className="mine"><div className="eyebrow dark">MY UNIVERSE</div><h1>你的世界，仍在生长。</h1><p>你已保存 {seeds.filter(seed=>seed.source!=='music').length} 份期待和 {seeds.filter(seed=>seed.source==='music').length} 组音乐植被。{saved?'数据保存在当前浏览器中。':'浏览器存储不可用，当前创作尚未保存。'}</p><div className="mine-grid">{[...projects,...defaultProjects].map(project=>{
    const world=songs.find(song=>song.id===project.worldId)
    if(!world)return null
    const objects=seeds.filter(seed=>seedProjectId(seed)===project.id)
    return <button className="mine-world" key={project.id} onClick={()=>enter(world,true,project.id)}>
      <div className="mine-icon"><img src={world.preview} alt={world.name}/></div>
      <div><strong>{project.name}</strong><span>{world.name} · {objects.filter(seed=>seed.source!=='music').length} 份期待 · {objects.filter(seed=>seed.source==='music').length} 组音乐植被</span></div>
      <ArrowRight size={18}/>
    </button>
   })}</div></main>}
  <footer className="player"><div className="player-title"><span className="player-icon"><Music2 size={20}/></span><div><strong>{audioName||'尚未选择音乐'}</strong><small>{audioName?(playing?'本地音频正在驱动场景':'音乐已暂停'):'选择你有权使用的本地音频'}</small></div></div><div className="player-actions"><input ref={uploadRef} type="file" accept="audio/*" hidden onChange={e=>{const file=e.target.files?.[0];if(file)importSong(file);e.target.value=''}}/><button className="upload" onClick={()=>uploadRef.current?.click()}>选择音乐</button><button className="play" onClick={()=>{if(audioName)void toggleAudio();else uploadRef.current?.click()}} aria-label={playing?'暂停':'播放'}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><Volume2 size={18} className="volume"/><div className="energy" role="meter" aria-label="音频能量" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(energy*100)}><span style={{width:(energy*100)+'%'}}/></div></div></footer>
  {(audioError||notice)&&<div className="notice" role="alert"><span>{audioError||notice}</span><button aria-label="关闭提示" onClick={()=>{setNotice('');clearError()}}>×</button></div>}
 </div>
}

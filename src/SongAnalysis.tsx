import WorldImaginationCard from './WorldImaginationCard'
import { useEffect, useRef, useState } from 'react'
import { analyzeSong, parseLrc, type NarrativeCue, type SongFeatureTimeline } from './audio/songFeatures'

export default function SongAnalysis({ file, imaginationProject, onPreview }: { file: File | null; imaginationProject?: string; onPreview?:()=>void }) {
  const pending = useRef<AbortController | null>(null)
  const [timeline, setTimeline] = useState<SongFeatureTimeline>()
  const [status, setStatus] = useState('')
  const [lyrics, setLyrics] = useState<NarrativeCue[]>([])
  const [stories, setStories] = useState<NarrativeCue[]>([])
  const [story, setStory] = useState('')
  const [time, setTime] = useState(0)
  const lyricRead = useRef(0)
  useEffect(() => () => { pending.current?.abort(); lyricRead.current++ }, [])

  function analyze() {
    if (!file) return
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setStatus('\u6b63\u5728\u672c\u5730\u5206\u6790')
    void analyzeSong(file, controller.signal).then(result => {
      if (controller.signal.aborted) return
      setTimeline(result)
      setStatus('\u5206\u6790\u5b8c\u6210')
    }).catch(() => {
      if (!controller.signal.aborted) setStatus('\u65e0\u6cd5\u5206\u6790\u6b64\u97f3\u9891\uff0c\u4ecd\u53ef\u7ee7\u7eed\u64ad\u653e\u3002')
    })
  }

  return <>
  <details className="song-analysis">
    <summary>歌曲分析与来源</summary>
    <button type="button" disabled={!file || status === '\u6b63\u5728\u672c\u5730\u5206\u6790'} onClick={analyze}>分析当前歌曲</button>
    <button type="button" onClick={() => { pending.current?.abort(); setStatus('\u5df2\u53d6\u6d88\u5206\u6790'); setTimeline(undefined) }}>取消分析</button>
    <p role="status">{status}</p>
    {timeline && <>
      <p>时长 {timeline.durationMs} ms · audio-observation</p>
      <svg role="img" aria-label="汇总能量" viewBox="0 0 300 60" width="100%">
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={timeline.windows.map(window =>
          (window.atMs / Math.max(1,timeline.durationMs) * 300) + ',' + (58 - window.energy * 56)).join(' ')} />
      </svg>
      <p>候选音乐转折（系统推测）</p>
      <ul>{timeline.candidates.map(item => <li key={item.atMs}>{item.atMs} ms · system · {item.confidence}</li>)}</ul>
    </>}
    <label>导入本地 LRC<input aria-label="导入本地 LRC" type="file" accept=".lrc" onChange={event => {
      const source = event.target.files?.[0]
      event.target.value = ''
      const read = ++lyricRead.current
      if (!source) return
      if (source.size > 256 * 1024) { setStatus('LRC \u8d85\u8fc7 256 KiB'); return }
      void source.text().then(text => {
        if (read === lyricRead.current) setLyrics(parseLrc(text))
      }).catch(() => { if (read === lyricRead.current) setStatus('\u65e0\u6cd5\u8bfb\u53d6 LRC') })
    }}/></label>
    <label>故事时码（毫秒）<input type="number" min="0" value={time} onChange={event => setTime(event.target.valueAsNumber)}/></label>
    <label>自己的故事段落<textarea value={story} maxLength={500} onChange={event => setStory(event.target.value)}/></label>
    <button type="button" disabled={!story.trim() || !Number.isFinite(time) || time < 0} onClick={() => {
      setStories(previous => [...previous, {atMs: Math.round(time), text: story.trim(), reason: {source:'user',inputSource:'user-story',interpretation:'user-confirmed'}}])
      setStory('')
    }}>加入故事标记</button>
    <ul>{[...lyrics,...stories].sort((a,b)=>a.atMs-b.atMs).map((cue,index) =>
      <li key={index}>{cue.atMs} ms · {cue.reason.inputSource} / {cue.reason.interpretation} · {cue.text}</li>)}</ul>
  </details>
  {imaginationProject && <WorldImaginationCard projectId={imaginationProject} timeline={timeline}
    onPreview={onPreview} stories={stories} lyricCount={lyrics.length} onAnalyze={analyze} canAnalyze={!!file && status !== '\u6b63\u5728\u672c\u5730\u5206\u6790'}/>}
  </>
}

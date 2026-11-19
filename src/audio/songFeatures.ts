export type DecisionReason = {
  source: 'lyric-explicit' | 'lyric-interpretation' | 'audio-observation' | 'user' | 'system'
  inputSource?: 'lrc' | 'user-story' | 'audio-analysis' | 'system'
  interpretation?: 'uninterpreted' | 'literal' | 'symbolic' | 'user-confirmed' | 'inferred'
  note?: string
}
export type NarrativeCue = { atMs: number; text: string; reason: DecisionReason }
export type SongFeatureTimeline = {
  version: 2
  durationMs: number
  windowMs: 1000
  windowTimestamp: 'start'
  transitionStepMs: 50
  windows: { atMs: number; energy: number; brightness: number; onsetDensity: number }[]
  candidates: { atMs: number; confidence: 'low' | 'medium'; reason: DecisionReason }[]
}

export function parseLrc(text: string): NarrativeCue[] {
  const offset = Number(text.match(/\[offset:\s*([+-]?\d+)\]/i)?.[1] ?? 0)
  return text.split(/\r?\n/).flatMap(line => {
    const matches = [...line.matchAll(/\[(\d{1,4}):([0-5]\d)(?:[.:](\d{1,3}))?\]/g)]
    const lyric = line.replace(/\[\d{1,4}:[0-5]\d(?:[.:]\d{1,3})?\]/g, '').trim()
    return lyric ? matches.map(([, minutes, seconds, fraction]) => ({
      atMs: Math.max(0, Number(minutes)*60000 + Number(seconds)*1000 + Number((fraction ?? '').padEnd(3,'0')) + offset),
      text: lyric, reason: {source:'user' as const, inputSource:'lrc' as const, interpretation:'uninterpreted' as const, note:'Imported timed text'},
    })) : []
  }).sort((a,b) => a.atMs-b.atMs).slice(0,2000)
}

export async function decodeLocalSong(file: File, signal: AbortSignal, identify?: (bytes: ArrayBuffer) => Promise<void>) {
  if (file.size > 40 * 1024 * 1024) throw Error('Audio exceeds 40 MiB')
  signal.throwIfAborted()
  const bytes = await file.arrayBuffer()
  signal.throwIfAborted()
  if (identify) await identify(bytes)
  signal.throwIfAborted()
  const audio = await new OfflineAudioContext(1, 1, 12000).decodeAudioData(bytes)
  signal.throwIfAborted()
  if (audio.duration > 300) throw Error('Audio exceeds five minutes')
  return audio
}

export async function analyzeSong(file: File, signal: AbortSignal): Promise<SongFeatureTimeline> {
  const audio = await decodeLocalSong(file, signal)
  return summarizeSong(audio, signal)
}

export async function summarizeSong(audio: Pick<AudioBuffer, 'sampleRate' | 'numberOfChannels' | 'length' | 'duration' | 'getChannelData'>, signal: AbortSignal): Promise<SongFeatureTimeline> {
  const rate = audio.sampleRate
  const channels = Array.from({length: audio.numberOfChannels}, (_, i) => audio.getChannelData(i))
  const hop = Math.round(rate * .05)
  const windows: SongFeatureTimeline['windows'] = []
  const blocks: { atMs: number; energy: number; brightness: number }[] = []
  let baseline = 0, lastOnset = -Infinity
  const quantize = (value: number) => Math.round(Math.min(1, value) * 100) / 100
  for (let start = 0; start < audio.length; start += rate) {
    if (windows.length % 8 === 0) {
      await new Promise(resolve => setTimeout(resolve,0))
      signal.throwIfAborted()
    }
    const end = Math.min(audio.length,start+rate)
    let power = 0, difference = 0, onsets = 0
    for (let block = start; block < end; block += hop) {
      const stop = Math.min(end,block+hop)
      let blockPower = 0, blockDifference = 0
      for (const samples of channels) for (let i = block; i < stop; i++) {
        blockPower += samples[i] ** 2
        if (i > start) blockDifference += (samples[i]-samples[i-1]) ** 2
      }
      const level = Math.sqrt(blockPower / ((stop-block)*channels.length))
      if (level > Math.max(.012,baseline*1.8) && block-lastOnset >= .15*rate) {
        onsets++
        lastOnset = block
      }
      baseline = baseline*.84 + level*.16
      power += blockPower
      difference += blockDifference
      if (stop - block === hop) blocks.push({ atMs: Math.round(block/rate*1000), energy: level,
        brightness: level < .012 ? 0 : Math.min(1, Math.sqrt(blockDifference/Math.max(blockPower,1e-9))*.5) })
    }
    windows.push({atMs: Math.round(start/rate*1000),energy:quantize(Math.sqrt(power/((end-start)*channels.length))),
      brightness:quantize(Math.sqrt(difference/Math.max(power,1e-9))*.5),onsetDensity:onsets})
  }
  const scores = []
  const side = 10
  for (let i = side; i <= blocks.length - side; i++) {
    const left = blocks.slice(i-side,i), right = blocks.slice(i,i+side)
    const average = (group: typeof blocks, key: 'energy' | 'brightness') =>
      group.reduce((sum, block) => sum + block[key], 0) / side
    const score = Math.abs(average(left,'energy') - average(right,'energy'))
      + .6 * Math.abs(average(left,'brightness') - average(right,'brightness'))
    if (score >= .14) scores.push({atMs: blocks[i].atMs, score})
  }
  // Consecutive boundary scores overlap. Keep the strongest in each neighborhood.
  const peaks: typeof scores = []
  for (const candidate of scores.sort((a,b) => b.score-a.score || a.atMs-b.atMs)) {
    if (peaks.every(peak => Math.abs(peak.atMs-candidate.atMs) >= 3000)) peaks.push(candidate)
  }
  const candidates: SongFeatureTimeline['candidates'] = peaks.sort((a,b)=>a.atMs-b.atMs).map(({atMs,score})=>({
    atMs, confidence:score>=.25?'medium':'low',
    reason:{source:'system',inputSource:'audio-analysis',interpretation:'inferred',note:'Contrast across a 50 ms boundary using 500 ms of audio on each side'},
  }))
  return {version:2,durationMs:Math.round(audio.duration*1000),windowMs:1000,windowTimestamp:'start',transitionStepMs:50,windows,candidates}
}

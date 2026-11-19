import { decodeLocalSong } from '../audio/songFeatures'
﻿import type { Seed } from '../storage'
import { moonCreekX, worldGroundHeight } from './terrain'

type Frame = { time: number; energy: number; brightness: number }
export type GrowthStage = { time: number; objects: Seed[] }

export async function analyzeMoonSong(file: File, projectId: string, signal: AbortSignal): Promise<GrowthStage[]> {
  let hash = ''
  const audio = await decodeLocalSong(file, signal, async bytes => {
    hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('')
  })
  const frames: Frame[] = []
  const channels = Array.from({ length: audio.numberOfChannels }, (_, index) => audio.getChannelData(index))
  const stride = Math.round(audio.sampleRate / 4)
  for (let start = 0; start < audio.length; start += stride) {
    if (frames.length % 24 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0))
      signal.throwIfAborted()
    }
    const end = Math.min(start + stride, audio.length)
    let power = 0
    let difference = 0
    for (const channel of channels) {
      for (let i = start; i < end; i++) {
        power += channel[i] ** 2
        if (i > start) difference += (channel[i] - channel[i - 1]) ** 2
      }
    }
    frames.push({
      time: start / audio.sampleRate,
      energy: Math.sqrt(power / ((end - start) * channels.length)),
      brightness: Math.sqrt(difference / Math.max(power, 1e-9)),
    })
  }
  const peak = Math.max(...frames.map(frame => frame.energy))
  const audible = frames.filter(frame => frame.energy >= Math.max(.002, peak * .08))
  if (!audible.length) return []
  const bright = audible.filter(frame => frame.brightness >= .48).length / audible.length > .45
  const offsets = bright
    ? [[-5, 6], [-8, -5], [13, -12]]
    : [[1.2, 7], [1.4, 1], [1.7, -5]]
  const stageFractions = [0, .36, .72]
  return offsets.map(([centerX, centerZ], stage) => {
    const index = Math.floor((audible.length - 1) * stageFractions[stage])
    const time = Math.max(audible[index].time + .25, .25)
    const objects = Array.from({length: 7}, (_, slot): Seed => {
      const spread = slot - 3
      const z = centerZ + (bright ? Math.sin(slot * 2.4) * 1.15 : spread * .85)
      const proposedX = centerX + (bright ? spread * .6 : Math.sin(slot * 2.4) * .48)
      const x = Math.abs(proposedX - moonCreekX(z)) < 3
        ? moonCreekX(z) - 3.2 : proposedX
      const tree = !bright && stage === 2 && slot % 3 === 0
      return {
        id: 'growth-v2-' + projectId + '-' + hash + '-' + stage + '-' + slot,
        projectId, worldId: 'moon', x, z,
        kind: tree ? 'tree' : bright ? 'flower' : 'mushroom',
        wish: tree ? '林下乔木' : bright ? '林隙花带' : '干岸菌群',
        source: 'music', growth: .4,
        music: { band: tree ? 'mid' : bright ? 'high' : 'low', seconds: time, sequence: stage + 1 },
      }
    }).filter(seed => worldGroundHeight('moon', seed.x, seed.z) > .15)
    return {time, objects}
  })
}

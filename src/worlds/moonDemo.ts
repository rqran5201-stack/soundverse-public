export const MOON_DEMO_SECTIONS = [
  { start: 0, name: '月下开场', description: '低音渐起，唤醒月光蘑菇。', frequency: 80 },
  { start: 16, name: '林间展开', description: '旋律升高，花丛沿空地舒展。', frequency: 900 },
  { start: 32, name: '星光尾声', description: '高音泛起微光，随后归于寂静。', frequency: 4500 },
] as const

export const MOON_DEMO_DURATION = 48

export function moonDemoSection(time: number) {
  return MOON_DEMO_SECTIONS[time >= 32 ? 2 : time >= 16 ? 1 : 0]
}

export function makeMoonDemo() {
  const rate = 22050
  const samples = rate * MOON_DEMO_DURATION
  const bytes = new ArrayBuffer(44 + samples * 2)
  const header = new DataView(bytes)
  for (const [offset, label] of [[0, 'RIFF'], [8, 'WAVEfmt '], [36, 'data']] as const) {
    for (let i = 0; i < label.length; i++) header.setUint8(offset + i, label.charCodeAt(i))
  }
  for (const [offset, value] of [[4, bytes.byteLength - 8], [16, 16], [24, rate], [28, rate * 2], [40, samples * 2]]) {
    header.setUint32(offset, value, true)
  }
  for (const [offset, value] of [[20, 1], [22, 1], [32, 2], [34, 16]]) header.setUint16(offset, value, true)
  for (const section of MOON_DEMO_SECTIONS) {
    for (let i = 0; i < rate * 16; i++) {
      const time = i / rate
      const envelope = Math.min(1, time * 2, (16 - time) * 2) * (0.8 + 0.2 * Math.cos(Math.PI * time))
      const melody = [1, 1.125, 1.25, 1.5][Math.floor(time / 2) % 4]
      const noteTime = time % 2
      const noteEnvelope = Math.min(1, noteTime * 20, (2 - noteTime) * 20)
      const wave = Math.sin(2 * Math.PI * section.frequency * melody * noteTime)
      header.setInt16(44 + (section.start * rate + i) * 2, wave * envelope * noteEnvelope * 13000, true)
    }
  }
  return new File([bytes], '月光森林 · 原创合成演示.wav', { type: 'audio/wav' })
}

export async function makeMoonPulseDemo(){
  const source=makeMoonDemo()
  const bytes=await source.arrayBuffer()
  const wave=new DataView(bytes)
  const rate=wave.getUint32(24,true)
  for(let i=0;i<(bytes.byteLength-44)/2;i++){
    const time=i/rate, beat=time%.58
    const section=time<9.5?.27:time<28.5?1:.52
    const pulse=beat<.15?1:.12
    const offset=44+i*2
    wave.setInt16(offset,Math.round(wave.getInt16(offset,true)*section*pulse),true)
  }
  return new File([bytes],'月光森林 · 脉冲实验.wav',{type:'audio/wav'})
}

export type AudioSignals = { active: boolean; level: number; low: number; mid: number; high: number; onset: number }
export const silentSignals = (): AudioSignals => ({ active: false, level: 0, low: 0, mid: 0, high: 0, onset: 0 })
const clamp = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0

/** Local DSP only: no song upload, emotion inference, or BPM claim. */
export function measureAudio(wave: Float32Array, spectrum: Float32Array, sampleRate: number): Omit<AudioSignals, 'onset'> {
  if (!wave.length || !spectrum.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return silentSignals()
  let square = 0
  for (const sample of wave) square += Number.isFinite(sample) ? sample * sample : 0
  const rms = Math.sqrt(square / wave.length)
  const powers = [0, 0, 0]
  for (let bin = 1; bin < spectrum.length; bin++) {
    const hz = bin * sampleRate / (spectrum.length * 2)
    if (hz < 20 || hz > 12000 || !Number.isFinite(spectrum[bin])) continue
    powers[hz < 250 ? 0 : hz < 2000 ? 1 : 2] += 10 ** (Math.min(0, spectrum[bin]) / 10)
  }
  return { active: true, level: clamp(rms * 3), low: clamp(Math.sqrt(powers[0]) * 3), mid: clamp(Math.sqrt(powers[1]) * 3), high: clamp(Math.sqrt(powers[2]) * 3) }
}

/** Attack/release envelopes use seconds, so motion is not tied to display FPS. */
export class AudioEnvelope {
  value = silentSignals()
  private previous = 0
  private fluxFloor = .02
  private cooldown = 0
  reset() { this.value = silentSignals(); this.previous = 0; this.fluxFloor = .02; this.cooldown = 0 }
  step(raw: Omit<AudioSignals, 'onset'>, seconds: number): AudioSignals {
    const dt = Math.max(0, Math.min(.25, Number.isFinite(seconds) ? seconds : 0))
    const strength = raw.active ? clamp(raw.low) * .65 + clamp(raw.mid) * .35 : 0
    const flux = Math.max(0, strength - this.previous)
    this.previous = strength
    this.cooldown = Math.max(0, this.cooldown - dt)
    const attack = raw.active && this.cooldown === 0 && flux > Math.max(.045, this.fluxFloor * 1.8)
    this.fluxFloor += (flux - this.fluxFloor) * (1 - Math.exp(-dt / .8))
    if (attack) this.cooldown = .18
    const next = { ...this.value, active: raw.active, onset: attack ? 1 : this.value.onset * Math.exp(-dt / .16) }
    for (const key of ['level', 'low', 'mid', 'high'] as const) {
      const target = raw.active ? clamp(raw[key]) : 0
      const tau = target > this.value[key] ? .07 : .25
      const value = this.value[key] + (target - this.value[key]) * (1 - Math.exp(-dt / tau))
      next[key] = value < .0001 ? 0 : value
    }
    this.value = next
    return next
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { audioFileProblem } from './audio/importPolicy'
import { AudioEnvelope, measureAudio, silentSignals, type AudioSignals } from './audio/signals'

type Session = {
  audio: HTMLAudioElement
  context: AudioContext
  analyser: AnalyserNode
  url: string
  spectrum: Float32Array<ArrayBuffer>
  wave: Float32Array<ArrayBuffer>
}

function dispose(session: Session | null) {
  if (!session) return
  session.audio.onerror = null
  session.audio.pause()
  session.audio.removeAttribute('src')
  session.audio.load()
  URL.revokeObjectURL(session.url)
  if (session.context.state !== 'closed') void session.context.close().catch(() => {})
}

export function useAudio() {
  const sessionRef = useRef<Session | null>(null)
  const intent = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [audioName, setAudioName] = useState('')
  const [sourceVersion, setSourceVersion] = useState(0)
  const [levels, setLevels] = useState<AudioSignals>(silentSignals)
  const signals = useRef<AudioSignals>(silentSignals())
  const envelope = useRef(new AudioEnvelope())
  const [error, setError] = useState('')

  useEffect(() => {
    let frame = 0
    let previous = 0
    let published = 0
    function animate(time: number) {
      if (time - previous >= 30) {
        const dt = previous ? (time - previous) / 1000 : .03
        previous = time
        const session = sessionRef.current
        if (session && !session.audio.paused && !session.audio.error) {
          session.analyser.getFloatFrequencyData(session.spectrum)
          session.analyser.getFloatTimeDomainData(session.wave)
          signals.current = envelope.current.step(measureAudio(session.wave, session.spectrum, session.context.sampleRate), dt)
        } else signals.current = envelope.current.step(silentSignals(), dt)
        // Scene callbacks consume the ref directly; React only updates the meter.
        if (time - published >= 100) { setLevels(signals.current); published = time }
      }
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(frame)
      intent.current++
      dispose(sessionRef.current)
      sessionRef.current = null
      signals.current = silentSignals()
      envelope.current.reset()
    }
  }, [])

  async function play(session: Session, request: number) {
    try {
      await session.context.resume()
      if (sessionRef.current !== session || request !== intent.current) return
      await session.audio.play()
      if (sessionRef.current === session && request === intent.current) setPlaying(true)
    } catch {
      if (sessionRef.current === session && request === intent.current) {
        setPlaying(false)
        setError('无法播放此音频，请更换文件或点击播放重试。')
      }
    }
  }

  async function loadAudio(file: File, loop = true, autoplay = true) {
    const problem = audioFileProblem(file)
    if (problem) {
      setError(problem)
      return
    }
    const request = ++intent.current
    setSourceVersion(value=>value+1)
    dispose(sessionRef.current)
    sessionRef.current = null
    setPlaying(false)
    signals.current = silentSignals()
    envelope.current.reset()
    setLevels(silentSignals())
    setAudioName('')
    setError('')
    let url: string | undefined
    let context: AudioContext | undefined
    try {
      url = URL.createObjectURL(file)
      context = new AudioContext()
      const audio = new Audio(url)
      audio.loop = loop
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = .2
      context.createMediaElementSource(audio).connect(analyser)
      analyser.connect(context.destination)
      const session = { audio, context, analyser, url, spectrum: new Float32Array(analyser.frequencyBinCount), wave: new Float32Array(analyser.fftSize) }
      sessionRef.current = session
      audio.onended = () => {
        if (sessionRef.current === session) setPlaying(false)
      }
      audio.onerror = () => {
        if (sessionRef.current !== session) return
        intent.current++
        setPlaying(false)
        setError('此文件无法解码，可能已损坏或使用了浏览器不支持的编码。请改用 PCM WAV 或 MP3。')
      }
      setAudioName(file.name)
      if (autoplay) await play(session, request)
    } catch {
      if (url) URL.revokeObjectURL(url)
      if (context && context.state !== 'closed') void context.close().catch(() => {})
      if (request === intent.current) {
        sessionRef.current = null
        setError('此浏览器无法初始化音频，请更换文件或浏览器后重试。')
      }
    }
  }

  async function toggleAudio() {
    const session = sessionRef.current
    if (!session) return
    setError('')
    const request = ++intent.current
    if (!session.audio.paused) {
      session.audio.pause()
      setPlaying(false)
    } else await play(session, request)
  }

  const currentTime = useCallback(() => sessionRef.current?.audio.currentTime ?? 0, [])
  const duration = useCallback(() => sessionRef.current?.audio.duration ?? NaN, [])
  const seek = useCallback((seconds: number) => {
    const audio = sessionRef.current?.audio
    if (audio && Number.isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(seconds,audio.duration))
  }, [])
  const clearAudio = () => {
    intent.current++
    dispose(sessionRef.current)
    sessionRef.current=null
    setPlaying(false);setAudioName('');setError('')
  }
  return { clearAudio, currentTime, duration, seek, playing, audioName, sourceVersion, energy: levels.level, levels, signals, error, loadAudio, toggleAudio, clearError: () => setError('') }
}

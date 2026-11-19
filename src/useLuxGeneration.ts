import { KIND_LABELS } from './worlds/growth'
import { useCallback, useEffect, useRef, useState } from 'react'
import { WORLD_DEFINITIONS } from './worlds/definitions'
import type { Seed } from './storage'
import type { LuxAsset } from './luxAsset'
import { publicWeb } from './publicWeb'

type JobState = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'
type Job = { id: string; state: JobState; modelAvailable: boolean }
type RecordState = { state: JobState | 'submitting' | 'uncertain' | 'paused' | 'error'; message: string; loading?: boolean }
class RequestError extends Error {
  constructor(public code: string, message: string, public retryAfter = 5) { super(message) }
}
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api/lux3d/${path}`, { ...options, signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(40_000)]) : AbortSignal.timeout(40_000) })
  const body = await response.json()
  if (!response.ok) throw new RequestError(body.code, body.message || '生成服务暂时不可用。', Number(response.headers.get('retry-after')) || 5)
  return body
}
const messages: Record<JobState, string> = {
  pending: '愿望已提交，正在等待生成。', running: 'Lux3D 正在塑造你的愿望…',
  succeeded: '模型生成完成，可以加载到这棵愿望树。', failed: '此次生成失败，你的愿望仍保留。', cancelled: '生成任务已取消，你的愿望仍保留。',
}
export function useLuxGeneration(seeds: Seed[], attachJob: (seedId: string, jobId: string) => void, markSubmitting: (seedId: string, uncertain: boolean) => void) {
  const [available, setAvailable] = useState(false)
  const [records, setRecords] = useState<Record<string, RecordState>>({})
  const [assets, setAssets] = useState<Record<string, LuxAsset>>({})
  const assetRef = useRef<Record<string, LuxAsset>>({})
  const creating = useRef(new Set<string>())
  const loads = useRef(new Map<string, AbortController>())
  const mounted = useRef(true)
  const [revision, setRevision] = useState(0)
  const jobKey = seeds.filter(seed => seed.luxJobId).map(seed => `${seed.id}:${seed.luxJobId}`).join('|')
  const jobSeeds = useRef(seeds)
  jobSeeds.current = seeds

  useEffect(() => {
    const controller = new AbortController()
    if (publicWeb || location.protocol === 'file:') return
    void request('config', { signal: controller.signal }).then(body => {
      if (!controller.signal.aborted) setAvailable(body.available === true)
    }).catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    if (publicWeb) return
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const deadline = Date.now() + 10 * 60_000
    function update(seedId: string, state: RecordState) {
      if (!controller.signal.aborted) setRecords(previous => ({ ...previous, [seedId]: { ...previous[seedId], ...state } }))
    }
    async function poll(seed: Seed) {
      if (controller.signal.aborted) return
      if (Date.now() > deadline) { update(seed.id, { state: 'paused', message: '查询已暂停，可继续查询原任务，无需重新生成。' }); return }
      let delay = 5000
      try {
        const job: Job = await request(`jobs/${seed.luxJobId}`, { signal: controller.signal })
        if (!['pending', 'running', 'succeeded', 'failed', 'cancelled'].includes(job.state)) throw new RequestError('INVALID_RESPONSE', '暂时无法识别任务状态。')
        update(seed.id, { state: job.state, message: job.state === 'succeeded' && !job.modelAvailable ? '任务已完成，但尚未提供可加载的 GLB。' : messages[job.state] })
        if (job.state !== 'pending' && job.state !== 'running') return
      } catch (error) {
        if (controller.signal.aborted) return
        const message = error instanceof Error ? error.message : '查询进度失败。'
        if (!(error instanceof RequestError) || error.code !== 'RATE_LIMITED') {
          update(seed.id, { state: 'paused', message: `${message} 可稍后继续查询。` }); return
        }
        delay = Math.max(5000, Math.min(error.retryAfter * 1000, 3600_000))
        update(seed.id, { state: 'running', message: '服务繁忙，稍后自动继续查询原任务。' })
      }
      if (!controller.signal.aborted) {
        const timer = setTimeout(() => { timers.delete(timer); void poll(seed) }, delay)
        timers.add(timer)
      }
    }
    for (const seed of jobSeeds.current) if (seed.luxJobId) void poll(seed)
    return () => { controller.abort(); timers.forEach(clearTimeout) }
  }, [jobKey, revision])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      loads.current.forEach(controller => controller.abort())
      for (const asset of Object.values(assetRef.current)) void import('./luxAsset').then(({ disposeAsset }) => disposeAsset(asset))
    }
  }, [])

  const generate = useCallback(async (seed: Seed) => {
    if (!available || seed.luxJobId || seed.luxSubmissionUncertain || creating.current.has(seed.id)) return
    creating.current.add(seed.id)
    markSubmitting(seed.id, true)
    setRecords(previous => ({ ...previous, [seed.id]: { state: 'submitting', message: '正在提交愿望，请勿重复操作…' } }))
    try {
      const job: Job = await request('jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldId: seed.worldId, prompt: `为自然梦境世界“${WORLD_DEFINITIONS[seed.worldId].theme}”创作一个独立三维物件。优先遵从用户指定的造型；未指定物件时使用${WORLD_DEFINITIONS[seed.worldId].defaultAsset}。自然材质、完整几何、无环境底座、无文字、无背景。用户选择的物件类型：${KIND_LABELS[seed.kind || 'tree']}。用户愿望：${seed.wish}` }),
      })
      if (!/^[a-f0-9-]{36}$/.test(job.id)) throw new RequestError('INVALID_RESPONSE', '提交结果暂不确定，请先在 Aholo 任务记录中确认。')
      if (mounted.current) {
        attachJob(seed.id, job.id)
        setRecords(previous => ({ ...previous, [seed.id]: { state: 'pending', message: messages.pending } }))
      }
    } catch (error) {
      if (!mounted.current) return
      const uncertain = !(error instanceof RequestError) || ['UPSTREAM_UNAVAILABLE', 'UPSTREAM_ERROR', 'INVALID_RESPONSE', 'INVALID_TASK_ID', 'CREATION_UNCERTAIN', 'JOURNAL_UNAVAILABLE'].includes(error.code)
      if (!uncertain) markSubmitting(seed.id, false)
      setRecords(previous => ({ ...previous, [seed.id]: { state: uncertain ? 'uncertain' : 'error', message: error instanceof Error ? error.message : '提交结果暂不确定，请先确认 Aholo 任务记录。' } }))
    } finally { creating.current.delete(seed.id) }
  }, [available, attachJob, markSubmitting])

  const loadModel = useCallback(async (seed: Seed) => {
    if (publicWeb) return
    if (!seed.luxJobId || loads.current.has(seed.id)) return
    const controller = new AbortController()
    loads.current.set(seed.id, controller)
    setRecords(previous => ({ ...previous, [seed.id]: { ...previous[seed.id], state: 'succeeded', loading: true, message: '正在加载模型，期间保留预览物件。' } }))
    let asset: LuxAsset | undefined
    const timer = setTimeout(() => controller.abort(new Error('模型加载超时，可稍后重新加载。')), 40_000)
    const aborted = new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true }))
    void aborted.catch(() => {})
    try {
      if (publicWeb || location.protocol === 'file:') return
      const response = await fetch(`/api/lux3d/jobs/${seed.luxJobId}/model`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(40_000)]) })
      if (!response.ok) { const error = await response.json(); throw new Error(error.message || '模型下载失败。') }
      const buffer = await response.arrayBuffer()
      if (buffer.byteLength > 15 * 1024 * 1024) throw new Error('模型超过 15 MiB，请优化后导入。')
      const { parseAsset, disposeAsset } = await import('./luxAsset')
      asset = await Promise.race([parseAsset(buffer, `Lux3D-${seed.id}.glb`, controller.signal), aborted])
      if (!mounted.current || controller.signal.aborted) { disposeAsset(asset); return }
      const old = assetRef.current[seed.id]
      assetRef.current = { ...assetRef.current, [seed.id]: asset }
      setAssets(assetRef.current)
      if (old) disposeAsset(old)
      setRecords(previous => ({ ...previous, [seed.id]: { state: 'succeeded', loading: false, message: '你的 Lux3D 专属物件已加载。' } }))
    } catch (error) {
      if (mounted.current) setRecords(previous => ({ ...previous, [seed.id]: { state: 'succeeded', loading: false, message: error instanceof Error ? error.message : '模型加载失败，可重新加载，无需重新生成。' } }))
    } finally { clearTimeout(timer); loads.current.delete(seed.id) }
  }, [])
  return { available, records, assets, generate, loadModel, resume: () => setRevision(value => value + 1) }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LuxAsset } from './luxAsset'
import { publicWeb } from './publicWeb'

const MAX_BYTES = 15 * 1024 * 1024
const TIMEOUT_MS = 8000
export function useLuxAsset(enabled: boolean) {
  const [asset, setAsset] = useState<LuxAsset | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle')
  const [message, setMessage] = useState('导入你有权使用的 Lux3D GLB，让期待长成独特的树。')
  const pending = useRef<AbortController | null>(null)
  const attempted = useRef(false)
  const load = useCallback(async (file?: File) => {
    if (!file && (publicWeb || location.protocol === 'file:')) return
    attempted.current = true
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setStatus('loading')
    setMessage('正在检查模型，期间仍显示程序化树木。')
    setAsset(null)
    const timer = setTimeout(() => controller.abort(new Error('模型加载超时，已保留程序化树木。')), TIMEOUT_MS)
    let onAbort: () => void = () => {}
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(controller.signal.reason)
      controller.signal.addEventListener('abort', onAbort, { once: true })
    })
    try {
      const result = await Promise.race([(async () => {
        if (file && (!file.name.toLowerCase().endsWith('.glb') || file.size > MAX_BYTES)) throw new Error('请选择不超过 15 MB 的 GLB 文件。')
        let buffer: ArrayBuffer
        if (file) buffer = await file.arrayBuffer()
        else {
          const response = await fetch('/models/starlight-tree.glb', { signal: controller.signal })
          if (response.status === 404 || (response.headers.get('content-type') || '').includes('text/html')) return null
          if (!response.ok) throw new Error('模型暂时无法读取，可重新尝试或导入本地 GLB。')
          if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('模型超过 15 MB，请先优化后重新导入。')
          buffer = await response.arrayBuffer()
        }
        if (buffer.byteLength > MAX_BYTES) throw new Error('模型超过 15 MB，请先优化后重新导入。')
        controller.signal.throwIfAborted()
        const { parseAsset } = await import('./luxAsset')
        return parseAsset(buffer, file?.name || 'starlight-tree.glb', controller.signal)
      })(), aborted])
      if (controller !== pending.current) {
        if (result) {
          const { disposeAsset } = await import('./luxAsset')
          disposeAsset(result)
        }
        return
      }
      setAsset(result)
      setStatus(result ? 'ready' : 'missing')
      setMessage(result ? `${result.name} · ${Math.round(result.triangles).toLocaleString()} 三角面 · ${result.materials} 材质` : '尚未导入本地通用模型。在线生成的模型会单独应用于对应愿望。')
    } catch (error) {
      if (controller !== pending.current) return
      setStatus('error')
      setMessage(`${error instanceof Error ? error.message : '模型无法加载。'} 可继续使用程序化树木。`)
    } finally {
      clearTimeout(timer)
      controller.signal.removeEventListener('abort', onAbort)
    }
  }, [])
  useEffect(() => {
    if (enabled && !attempted.current) void load()
  }, [enabled, load])
  useEffect(() => () => {
    const controller = pending.current
    pending.current = null
    attempted.current = false
    controller?.abort()
  }, [])
  useEffect(() => () => {
    if (asset) void import('./luxAsset').then(({ disposeAsset }) => disposeAsset(asset))
  }, [asset])
  return { asset, status, message, load }
}

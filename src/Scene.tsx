import { Component, lazy, memo, Suspense, useState, type ReactNode } from 'react'
import type { WorldProps } from './World'

const World = lazy(() => import('./World'))
function Fallback({ loading = false }: { loading?: boolean }) {
  return <div className="scene-fallback" role="status"><span aria-hidden="true">✧</span><strong>{loading ? '梦境正在展开…' : '三维景观暂时不可用'}</strong><p>{loading ? '你可以先探索画廊，或写下期待。' : '请使用支持 WebGL 2 的浏览器并启用硬件加速。音乐、愿望和本地保存仍可使用。'}</p></div>
}
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <Fallback /> : this.props.children }
}
function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2')
    if (!context) return { supported: false, software: false }
    const debug = context.getExtension('WEBGL_debug_renderer_info')
    const renderer = debug ? String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : ''
    const software = /swiftshader|llvmpipe|software/i.test(renderer)
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return { supported: true, software }
  } catch { return { supported: false, software: false } }
}
function Scene(props: WorldProps) {
  const [capability] = useState(supportsWebGL)
  if (!capability.supported) return <Fallback />
  return <SceneBoundary><Suspense fallback={<Fallback loading />}><World {...props} softwareRenderer={capability.software} /></Suspense></SceneBoundary>
}

export default memo(Scene)

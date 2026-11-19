import { Box3, Material, Mesh, Texture, Vector3, type Group } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export type LuxAsset = {
  scene: Group; name: string; scale: number; offset: [number, number, number]
  triangles: number; materials: number
}
export function disposeAsset(asset: LuxAsset) {
  const geometries = new Set<Mesh['geometry']>()
  const materials = new Set<Material>()
  const textures = new Set<Texture>()
  asset.scene.traverse(object => {
    if (!(object instanceof Mesh)) return
    geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value)
    }
  })
  textures.forEach(texture => texture.dispose())
  materials.forEach(material => material.dispose())
  geometries.forEach(geometry => geometry.dispose())
}

// Accept only self-contained GLB 2 files; external references must not trigger
// unreviewed network requests or require credentials from the browser.
export async function parseAsset(buffer: ArrayBuffer, name: string, signal: AbortSignal): Promise<LuxAsset> {
  const view = new DataView(buffer)
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2
    || view.getUint32(8, true) !== buffer.byteLength || view.getUint32(16, true) !== 0x4e4f534a) throw new Error('请选择完整的 GLB 2 模型。')
  const jsonLength = view.getUint32(12, true)
  if (20 + jsonLength > buffer.byteLength) throw new Error('模型数据不完整。')
  const json = JSON.parse(new TextDecoder().decode(buffer.slice(20, 20 + jsonLength)))
  for (const entry of [...(json.buffers || []), ...(json.images || [])]) {
    if (entry.uri && !entry.uri.startsWith('data:')) throw new Error('请将贴图和缓冲数据嵌入 GLB 后重新导出。')
  }
  signal.throwIfAborted()
  const gltf = await new GLTFLoader().parseAsync(buffer, '')
  const bounds = new Box3().setFromObject(gltf.scene)
  const size = bounds.getSize(new Vector3())
  const center = bounds.getCenter(new Vector3())
  const asset: LuxAsset = {
    scene: gltf.scene, name, scale: 1, offset: [-center.x, -bounds.min.y, -center.z], triangles: 0, materials: 0,
  }
  if (signal.aborted || bounds.isEmpty() || !Number.isFinite(size.length()) || size.y <= 0) {
    disposeAsset(asset)
    signal.throwIfAborted()
    throw new Error('模型没有可用的三维几何。')
  }
  asset.scale = Math.min(2.4 / size.y, 3 / Math.max(size.x, size.z))
  const materials = new Set<Material>()
  gltf.scene.traverse(object => {
    if (!(object instanceof Mesh)) return
    asset.triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position')?.count ?? 0) / 3
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
  })
  if (!asset.triangles) {
    disposeAsset(asset)
    throw new Error('模型没有可用的三角网格。')
  }
  asset.materials = materials.size
  return asset
}

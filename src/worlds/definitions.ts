import type { WorldId } from '../storage'

export type WorldDefinition = {
  theme: string; spatialForm: 'coastal-island' | 'forest-valley' | 'rolling-coast'
  colorPalette: readonly string[]; lifeForms: readonly string[]
  atmosphere: readonly string[]; motionLanguage: readonly string[]
  camera: [number, number, number]; target: [number, number, number]
  story: string; invitation: string; defaultAsset: string
  provenance: 'curated-example'
}

// Curated, engine-supported configurations. No LLM or listener-consensus claim.
export const WORLD_DEFINITIONS: Record<WorldId, WorldDefinition> = {
  sea: {
    theme: '海风与远方', spatialForm: 'coastal-island', colorPalette: ['碧水', '鼠尾草绿', '暖白'],
    lifeForms: ['海岸树', '野花', '飞鸟'], atmosphere: ['海风', '薄云', '日光'], motionLanguage: ['波纹', '风摆', '漂移'],
    camera: [2.4, 2.25, 8.2], target: [5.2, 1.65, -5], story: '风经过的地方，\n愿望正在生长。',
    invitation: '让海风，带来一点新的想象。', defaultAsset: '一棵随海风生长的星光树', provenance: 'curated-example',
  },
  moon: {
    theme: '月光下的林间停留', spatialForm: 'forest-valley', colorPalette: ['蓝绿', '银白', '暖金'],
    lifeForms: ['高树', '蘑菇', '萤火虫'], atmosphere: ['月光', '林间雾', '溪流'], motionLanguage: ['流淌', '微光呼吸', '枝叶轻摆'],
    camera: [3.8, 2.65, 10.8], target: [3.1, 1.55, -6], story: '沿着月光，\n听见森林的回声。',
    invitation: '在林间，留下一件属于你的奇物。', defaultAsset: '一簇月光蘑菇', provenance: 'curated-example',
  },
  field: {
    theme: '金色午后的自由', spatialForm: 'rolling-coast', colorPalette: ['麦金', '天青', '奶白'],
    lifeForms: ['长草', '野花', '海岸树'], atmosphere: ['午后暖光', '海风', '远处海岬'], motionLanguage: ['草浪', '花茎轻摆', '海面流动'],
    camera: [1.1, 2.95, 11], target: [-2.8, 1.65, -9], story: '风掠过旷野，\n把远方留在心里。',
    invitation: '让一阵风，吹出你的花园。', defaultAsset: '一株有独特轮廓的风铃花', provenance: 'curated-example',
  },
}

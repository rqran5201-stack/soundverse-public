import seaPreview from '../assets/worlds/sea.jpg'
import moonPreview from '../assets/worlds/moon.jpg'
import fieldPreview from '../assets/worlds/field.jpg'
import type { WorldId } from '../storage'

export type Palette = {
  sky: string; fog: string; water: string; grass: string; earth: string
  leaves: string[]; flowers: string[]; light: string; sun: [number, number, number]
}
export const WORLD_PALETTES: Record<WorldId, Palette> = {
  sea: { sky: '#c7e0df', fog: '#c7e0df', water: '#4fa8aa', grass: '#93b482', earth: '#879582', leaves: ['#83ad94', '#a7c5a2', '#739e89'], flowers: ['#fff0ca', '#eacbd5', '#e5efd7'], light: '#fff2d7', sun: [10, 6, -12] },
  moon: { sky: '#283b59', fog: '#455672', water: '#4e7187', grass: '#6d8d91', earth: '#526276', leaves: ['#6d92a1', '#91adb7', '#72899f'], flowers: ['#d9d8f1', '#c5ddeb', '#f5e7cf'], light: '#d9e0ff', sun: [-12, 8, -8] },
  field: { sky: '#e6dec5', fog: '#e6dec5', water: '#c5cba3', grass: '#d0c38e', earth: '#a99a77', leaves: ['#b5b77d', '#c5ca96', '#9ca976'], flowers: ['#ffdf91', '#fff0c7', '#e5bba4'], light: '#fff0c2', sun: [-8, 4, -12] },
}


export const WORLD_CATALOG = [
 {id:'sea',preview:seaPreview,name:'风之海',english:'The Sea of Wind',song:'演示歌曲 A',mood:'自由 · 海风 · 夏日',desc:'当旋律吹过海面，所有的远方都变得触手可及。',palette:'sea'},
 {id:'moon',preview:moonPreview,name:'月光森林',english:'Moonlit Forest',song:'演示歌曲 B',mood:'安宁 · 陪伴 · 梦境',desc:'把喧嚣留在树影之外，听月光缓慢落下。',palette:'moon'},
 {id:'field',preview:fieldPreview,name:'夏日旷野',english:'Summer Fields',song:'演示歌曲 C',mood:'温暖 · 青春 · 自由',desc:'风穿过旷野，带着一整个金色的下午。',palette:'field'}
] as const

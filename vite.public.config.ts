import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const captureColors: Record<string, string> = {
  'sea.jpg': '#5c8291', 'moon.jpg': '#293752', 'field.jpg': '#9da46b',
}

function publicAssets(): Plugin {
  const prefix = '\0soundverse-public:'
  return {
    name: 'soundverse-public-assets',
    enforce: 'pre',
    resolveId(source) {
      if (source.endsWith('.glb')) return prefix + 'unavailable'
      if (source.includes('/assets/worlds/')) {
        const filename = source.split('/').at(-1)!
        if (filename in captureColors) return prefix + filename
      }
    },
    load(id) {
      if (!id.startsWith(prefix)) return
      const color = captureColors[id.slice(prefix.length)]
      const svg = color ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><defs><linearGradient id="h" x2="0" y2="1"><stop stop-color="' + color + '"/><stop offset="1" stop-color="#182c34"/></linearGradient></defs><path fill="url(#h)" d="M0 0h600v300H0z"/></svg>' : ''
      return 'export default ' + JSON.stringify(svg ? 'data:image/svg+xml,' + encodeURIComponent(svg) : '')
    },
    generateBundle(_options, bundle) {
      for (const name of Object.keys(bundle)) {
        if (!/\.(html|css|js)$/.test(name)) this.error('Unexpected public output: ' + name)
      }
    },
  }
}

export default defineConfig({
  publicDir: false,
  plugins: [publicAssets(), react()],
  define: { __SOUNDVERSE_PUBLIC__: 'true' },
  build: { sourcemap: false, emptyOutDir: true },
})
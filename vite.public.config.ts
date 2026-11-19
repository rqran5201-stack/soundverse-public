import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const publicModels = ['starlight-tree.glb','moon-mushrooms.glb','moon-ancient-tree.glb','moon-tall-tree.glb','moon-moss-rock.glb','moon-ferns.glb']
function publicAssets(): Plugin {
  const unavailable = '\0soundverse-public:unavailable'
  return {
    name: 'soundverse-public-assets',
    enforce: 'pre',
    resolveId(source) {
      if (source.endsWith('.glb') && !publicModels.includes(source.split('/').at(-1)!)) return unavailable
    },
    load(id) {
      if (id === unavailable) return 'export default ""'
    },
    generateBundle(_options, bundle) {
      for (const name of Object.keys(bundle)) {
        if (!/\.(html|css|js|glb|jpg)$/.test(name)) this.error('Unexpected public output: ' + name)
      }
    },
  }
}
export default defineConfig({
  assetsInclude: ['**/*.glb'],
  publicDir: false,
  plugins: [publicAssets(), react()],
  define: { __SOUNDVERSE_PUBLIC__: 'true' },
  build: { sourcemap: false, emptyOutDir: true },
})

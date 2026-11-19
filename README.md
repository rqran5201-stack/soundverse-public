# SOUNDVERSE — Every song opens a world

**SOUNDVERSE — 让每首歌，都成为一个世界。**

Demo: https://soundverse-ivory.vercel.app

导入音乐，写下你的想象，生成一座可以探索、编辑与保存的 3D 世界。Three real-time base worlds and Moon Forest V2 through Step 6: structured imagination, deterministic paths and memory places, A/B/C musical narrative, private local saves and fingerprint re-association.

## Run

Node.js 22.19+ (22 or 24 LTS recommended).

    npm ci
    npm exec vite -- --config vite.public.config.ts

Production:

    npm run build:web
    npm run preview

Vercel: root ./, Vite, npm ci, npm run build:web, output dist. No API keys required.

## First visit

Use “立即体验” for a 48-second browser-generated synthetic demo (no third-party recording), then click play. “用我的音乐创作” opens local-song creation. Select structured space options to confirm what your imagination means; arbitrary natural-language story understanding is not claimed.

Recommended PCM WAV; MP3 also tested in desktop Edge. Files ≤40 MiB, full-song analysis ≤5 minutes. M4A/FLAC and other encodings are browser-dependent and not uniformly verified. Encrypted NCM is not directly supported. Local audio is not uploaded or stored in the work.

## Aholo / Lux3D assets

The creator explicitly confirmed on 2026-11-19 that these assets may be publicly displayed in the competition website. Six selected self-contained GLBs are now included: starlight tree, mushroom cluster, ancient tree, natural tall tree, moss rock and fern cluster. Textures were optimized; geometry and UVs are unchanged. Public instance counts are bounded. Other heavy assets remain on procedural fallback. See ASSET_AUDIT.md and ASSET_PROVENANCE.md for provenance, sizes, usage and limitations. Public display does not grant an open asset reuse license.

The optional paid generation backend remains disabled in the public build. No credentials, personal music, private saves, original lyrics, signed URLs or private development history are distributed.

## Persistence and boundaries

Private works store versioned blueprints, compiled structure, seed, stable IDs, edits and a private audio fingerprint. Missing music still allows a static visit; the original local file must match before synchronized playback resumes. Storage is scoped to the site origin; cloud backup and public sharing are not implemented. moon-1 and moon-2 remain separate.

React 19 / TypeScript / Vite / Three.js / React Three Fiber / Drei / Web Audio. The private development test suite is not redistributed in this source snapshot. No general open-source or asset reuse license is granted unless the author adds one; dependency licenses remain with their owners.

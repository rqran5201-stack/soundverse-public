# SOUNDVERSE
## Every song opens a world.

Live demo: https://soundverse-ivory.vercel.app

SOUNDVERSE explores how music and user imagination can shape an explorable, editable and revisitable 3D world. This public competition source snapshot includes the three base worlds and Moon Forest V2 through Song-to-World Step 6, plus the final submission-entry fixes.

## Run locally

Use Node.js 22.19+ (Node 22 LTS or 24 LTS recommended).

    npm ci
    npm run dev

Build the public production version:

    npm run build
    npm run preview

Vercel settings are included in vercel.json:
- Framework: Vite
- Root: ./
- Install: npm ci
- Build: npm run build:web
- Output: dist
- Environment variables: none required

## Try the product

Click “立即体验” on the homepage to prepare a 48-second browser-generated synthetic demo, then click “播放”. No personal song is required.

Moon Forest V2 supports editable structured imagination fields, different routes and memory places, A/B/C narrative seeking, local private saves, and audio fingerprint re-association after revisiting. Story text does not claim arbitrary automatic semantic understanding.

## Local Audio First

Local audio is selected, played and analyzed in the browser. Works save structured world data and a private audio fingerprint, not the original audio, PCM, object URL or full imported lyrics. Missing music still allows a static visit. Browser storage is scoped to the website origin and is not a cross-device cloud backup.

The synthetic demos are generated from project code, with no third-party recordings or samples. Use only music you are authorized to use.

## Public-release asset boundary

Unconfirmed-public-license GLBs, captured artwork, personal music, private saves, server task journals, credentials and development history are excluded from this repository. The public Vite configuration resolves excluded model imports to procedural fallbacks and uses simple generated gallery artwork.

Lux3D single-asset generation and imported models were validated in the private development prototype. The public Web release does not enable paid generation, expose server credentials or claim complete AI world generation. Relative GLB imports remain as integration points and are handled by vite.public.config.ts; the original binary assets are intentionally absent.

This repository is a fresh public snapshot, not a mirror of the private repository's branches or history. It matches the public app source at private release 7e8badd, with public-only npm scripts made self-contained. Private tests and Windows packaging scripts are not included.

## Stack and validation

React 19, TypeScript, Vite, Three.js, React Three Fiber, Drei and Web Audio.
Validation on the release: production build, 40 development-unit tests, clean Edge HTTPS flow through the three worlds, V2 creation, synthetic audio A/B/C seek, private save/refresh/relink, and edit preservation. Public deployment verification recorded no resource errors or audio upload requests.
Public-only npm scripts expose development, build and preview; the private test suite is not redistributed here.

No open-source license is granted by this snapshot unless the author adds a LICENSE. Public source visibility is provided for competition review; dependency licenses remain with their respective owners.
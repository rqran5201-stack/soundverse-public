import { TerrainMaterial } from './TerrainMaterial'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { coastGeometry, groundHeight, islandGeometry, random } from '../dreamscape'
import type { Palette } from '../worlds/catalog'
import { useDynamics, windPhase } from './dynamics'

export function Water({ color, sky, shoreCenter = [0, 0], shoreScale = [1, 1], creek = false, coast = false }: { energy?: number; motion?: boolean; color: string; sky: string; shoreCenter?: [number, number]; shoreScale?: [number, number]; creek?: boolean; coast?: boolean }) {
  const dynamics = useDynamics()
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ daylight: {value: 1}, coast: {value: coast ? 1 : 0}, creek: {value: creek ? 1 : 0}, shoreCenter: {value: new THREE.Vector2(...shoreCenter)}, shoreScale: {value: new THREE.Vector2(...shoreScale)}, shimmer: {value: 0}, time: {value: 0}, strength: {value: .1}, water: {value: new THREE.Color(color)}, horizon: {value: new THREE.Color(sky)} }), [color, sky, creek, coast, shoreCenter[0], shoreCenter[1], shoreScale[0], shoreScale[1]])
  useFrame(() => {
    if (material.current) { material.current.uniforms.time.value = dynamics.current.time; material.current.uniforms.strength.value = dynamics.current.tide; material.current.uniforms.shimmer.value = dynamics.current.shimmer }
  })
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.29, 0]}>
    <planeGeometry args={creek ? [24, 60, 1, 96] : [500, 500]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={`uniform float creek; varying vec2 p; varying float waterHeight;
      void main(){
        vec4 world=modelMatrix*vec4(position,1.);
        float z=world.z;
        float shelves=.052*sin(z*.91)+.031*sin(z*1.73+.7);
        world.y+=creek*(.23*smoothstep(8.,21.,-z)+shelves);
        p=world.xz;waterHeight=world.y;
        gl_Position=projectionMatrix*viewMatrix*world;
      }`}
      fragmentShader={`uniform float daylight;uniform float coast;uniform float creek;uniform vec2 shoreCenter;uniform vec2 shoreScale;uniform float time;uniform float strength;uniform float shimmer;uniform vec3 water;uniform vec3 horizon;varying vec2 p;varying float waterHeight;
      void main(){vec2 shorePoint=(p-shoreCenter)/shoreScale;float radius=length(shorePoint);float t=time*.2;float waves=sin(p.x*1.5+p.y*.8+t)*sin(p.y*1.8-p.x*.4-t*.8);float fine=pow(max(0.,sin(p.x*.8+p.y*2.3+t+sin(p.x*.6+t))),24.)*pow(max(0.,sin(p.x*1.9-p.y*.6-t)),4.);
      float shallows=exp(-pow((radius-5.3)/2.4,2.));vec3 c=mix(water*.68,water*1.2,.45+waves*(.07+strength*.12));c=mix(c,vec3(.50,.79,.70),shallows*.5);c+=vec3(.85,.91,.74)*fine*(.06+shimmer*.18);
      float foam=pow(max(0.,sin(radius*7.2+sin(atan(shorePoint.y,shorePoint.x)*3.)*.6-t)),18.)*exp(-pow((radius-5.5)/1.1,2.));c=mix(c,vec3(.90,.94,.82),foam*.4);float coastLine=6.1+1.4*sin(p.y*.29)+.8*sin(p.y*.63);
      float coastDistance=p.x-coastLine;
      float surfZone=exp(-pow((coastDistance-1.05)/1.45,2.))*(1.-smoothstep(16.,23.,abs(p.y)));
      float brokenFoam=pow(max(0.,sin(coastDistance*8.+sin(p.y*.8)*.8+t*1.8)),12.)
        *smoothstep(-.45,.65,sin(p.y*1.8+coastDistance*1.4));
      c=mix(c,vec3(.24,.48,.46),surfZone*.36*coast);
      c=mix(c,vec3(.75,.84,.79),brokenFoam*surfZone*(.22+.16*strength)*coast);
      float channel=p.x-(6.6+sin(p.y*.15)*1.5);
      if(creek>.5 && abs(channel)>1.65) discard;
      float bankDistance=abs(channel+.14*sin(p.y*1.9)+.076*cos(p.y*3.1+channel));
      float shallowsWidth=.83+.18*sin(p.y*.73)+.09*sin(p.y*1.46);
      float deep=1.-smoothstep(.29,shallowsWidth,bankDistance);
      vec3 eye=normalize(cameraPosition-vec3(p.x,waterHeight,p.y));
      float reflection=pow(1.-clamp(eye.y,0.,1.),3.);
      float grain=sin(p.y*3.8-t*4.+sin(channel*8.+p.y*.55)*1.6)*cos(channel*12.+p.y*1.2+t);
      float ripple=smoothstep(.57,.97,grain)*(.34+.66*smoothstep(-.5,.6,sin(p.y*.8-channel*3.)));
      vec3 stream=mix(vec3(.034,.049,.04),water*.82,deep);
      float margin=smoothstep(.36,.85,bankDistance);
      float silt=.5+.5*sin(p.y*5.3+channel*12.+sin(p.y*2.2));
      stream=mix(stream,vec3(.047,.057,.043),margin*(.58+.21*silt));
      stream=mix(stream,horizon*1.23,reflection*(.38-.24*margin));
      stream+=vec3(.22,.33,.46)*ripple*(.08+.12*strength)*(.25+.75*deep);
      c=mix(c,stream,creek);c=mix(c,horizon,smoothstep(35.,110.,length(cameraPosition-vec3(p.x,-.29,p.y))));gl_FragColor=vec4(c*daylight,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`} />
  </mesh>
}

export function Island({ palette, coast = false }: { palette: Palette; coast?: boolean }) {
  const geometry = useMemo(() => (coast ? coastGeometry : islandGeometry)(palette.grass, palette.earth), [palette, coast])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} receiveShadow><TerrainMaterial coastal={coast} /></mesh>
}

export function Tree({ x, z, motion, palette, scale = 1, luminous = false }: {
  x: number; z: number; energy: number; motion: boolean; palette: Palette; scale?: number; luminous?: boolean
}) {
  const dynamics = useDynamics()
  const sway = useRef<THREE.Group>(null)
  useFrame(() => {
    if (sway.current) sway.current.rotation.z = motion ? windPhase(dynamics.current.time, x, z) * dynamics.current.wind : 0
  })
  return <group position={[x, groundHeight(x,z), z]} scale={scale}><group ref={sway}>
    <mesh castShadow position={[0, .78, 0]}><cylinderGeometry args={[.12, .21, 1.55, 7]} /><meshStandardMaterial color="#806e57" /></mesh>
    {[[-.55, 1.7, 0], [.53, 1.65, .1], [0, 2.14, 0], [-.1, 1.83, -.48],[-.9,1.85,.3],[.82,1.95,-.28],[.3,2.4,.15],[-.5,2.3,-.2]].map(([a, b, c], i) => <mesh castShadow key={i} position={[a, b, c]} scale={i<4?[.74,.57,.68]:[.55,.43,.5]}>
      <icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color={luminous ? palette.flowers[i % 3] : palette.leaves[i % 3]} roughness={.91} emissive={luminous ? palette.water : '#000000'} emissiveIntensity={luminous ? .2 : 0} />
    </mesh>)}
  </group></group>
}

// Three instanced meshes replace hundreds of individual flower draw calls.
export function Wildflowers({ palette }: { palette: Palette }) {
  const invalidate = useThree(state => state.invalidate)
  const stems = useRef<THREE.InstancedMesh>(null)
  const petals = useRef<THREE.InstancedMesh>(null)
  const centers = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    if (!stems.current || !petals.current || !centers.current) return
    const dummy = new THREE.Object3D()
    for (let i = 0; i < 120; i++) {
      const angle = random(i,1) * Math.PI * 2
      const radius = Math.sqrt(random(i,2)) * 1.35
      const center = [[-2.3,1.6],[2.6,-1.1],[1.3,2.6],[-1.4,-2.5]][i%4]
      const x = center[0]+Math.cos(angle) * radius, z = center[1]+Math.sin(angle) * radius
      const y = groundHeight(x,z)
      dummy.position.set(x, y+.16, z); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
      stems.current.setMatrixAt(i, dummy.matrix)
      dummy.position.set(x, y+.34, z); dummy.scale.set(.045, .04, .045); dummy.updateMatrix()
      centers.current.setMatrixAt(i, dummy.matrix)
      for (let j = 0; j < 5; j++) {
        dummy.position.set(x + Math.cos(j * 1.2566) * .09, y+.32, z + Math.sin(j * 1.2566) * .09)
        dummy.scale.set(.10, .045, .075); dummy.updateMatrix()
        petals.current.setMatrixAt(i * 5 + j, dummy.matrix)
        petals.current.setColorAt(i * 5 + j, new THREE.Color(palette.flowers[i % 3]))
      }
    }
    for (const mesh of [stems.current, petals.current, centers.current]) {mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere()}
    if (petals.current.instanceColor) petals.current.instanceColor.needsUpdate = true
    invalidate()
  }, [palette, invalidate])
  return <group>
    <instancedMesh ref={stems} args={[undefined, undefined, 120]}><cylinderGeometry args={[.012, .02, .32, 5]} /><meshStandardMaterial color={palette.leaves[0]} /></instancedMesh>
    <instancedMesh ref={petals} args={[undefined, undefined, 600]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial roughness={.9} /></instancedMesh>
    <instancedMesh ref={centers} args={[undefined, undefined, 120]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#e4b774" /></instancedMesh>
  </group>
}


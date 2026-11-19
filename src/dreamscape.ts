import * as THREE from 'three'

export function edgeRadius(angle: number) {
  return 5.45 + Math.sin(angle * 3 + .5) * .3 + Math.cos(angle * 5 - .3) * .16
}
export function groundHeight(x: number, z: number) {
  const radius = Math.hypot(x, z)
  const relative = radius / edgeRadius(Math.atan2(z, x))
  const hill = .65 * Math.exp(-((x + 1.9) ** 2 / 5 + (z + 2.1) ** 2 / 3))
  return .46 + hill + .045 * Math.sin(x * 1.1) * Math.sin(z * 1.3) - Math.max(0, relative - .72) ** 1.5 * 6
}
export function coastHeight(x: number, z: number) {
  const radius = Math.hypot(x, z)
  const blend = THREE.MathUtils.smoothstep(radius, 4, 7)
  const shore = 6.1 + 1.4 * Math.sin(z * .29) + .8 * Math.sin(z * .63)
  const outer = .48 + .22 * Math.sin(z * .31) + .16 * Math.cos(x * .5)
    - THREE.MathUtils.smoothstep(x, shore - 1.8, shore + 1.4) * 1.25
    - THREE.MathUtils.smoothstep(Math.abs(z), 16, 24) * 1.25
  const reef = 1.12 * Math.exp(-(((x - 8.3) / 3.8) ** 2 + ((z + 9) / 3.0) ** 2))
  return THREE.MathUtils.lerp(groundHeight(x, z), outer + reef, blend)
}

export function coastGeometry(grass: string, earth: string) {
  const geometry = new THREE.PlaneGeometry(43, 52, 100, 104)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(-12, 0, 0)
  const positions = geometry.attributes.position
  const turf = new THREE.Color(grass)
  const sand = new THREE.Color('#a79c82')
  const wet = new THREE.Color(earth)
  const color = new THREE.Color()
  const colors: number[] = []
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i)
    const height = coastHeight(x, z)
    positions.setY(i, height)
    color.copy(wet).lerp(sand, THREE.MathUtils.smoothstep(height, -.28, -.04))
    const exposedReef = Math.exp(-(((x - 8.3) / 3.8) ** 2 + ((z + 9) / 3) ** 2))
    const grassWeight = THREE.MathUtils.smoothstep(height + .055 * Math.sin(z * 2 + x), .08, .48)
    color.lerp(turf, grassWeight * (1 - exposedReef))
    color.lerp(wet, exposedReef * .75)
    color.multiplyScalar(.93 + .07 * Math.sin(x * 1.2 + z * .8))
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function islandGeometry(grass: string, earth: string) {
  const segments = 96, rings = 22
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const green = new THREE.Color(grass), sand = new THREE.Color('#e4d3a8'), rock = new THREE.Color(earth)
  for (let ring = 0; ring <= rings; ring++) for (let j = 0; j <= segments; j++) {
    const angle = j / segments * Math.PI * 2
    const relative = ring / rings
    const radius = relative * edgeRadius(angle)
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius
    positions.push(x, groundHeight(x, z), z)
    const color = relative < .76 ? green.clone().multiplyScalar(.93 + .08 * Math.sin(x * 2 + z)) : sand.clone().lerp(rock, Math.max(0, relative - .92) * 4)
    colors.push(color.r, color.g, color.b)
    if (ring < rings && j < segments) {
      const a = ring * (segments + 1) + j, b = a + 1, c = a + segments + 1, d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}
export function random(index: number, salt = 0) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453
  return value - Math.floor(value)
}

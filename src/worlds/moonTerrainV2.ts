const smooth = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function creekSection(z: number) {
  const center = 7.7 + 1.34 * Math.sin(z * .20 + .65) + .57 * Math.sin(z * .41)
  const width = 1.36 + .34 * Math.sin(z * .27 + 1) + .17 * Math.cos(z * .58)
  const left = width * (.88 + .17 * Math.sin(z * .43))
  const right = width * (1.10 + .16 * Math.cos(z * .31))
  return { center, left, right, level: .06 + .009 * Math.max(-31, Math.min(25, z)) }
}

export function creekClearance(x: number, z: number) {
  const {center, left, right} = creekSection(z)
  return Math.max(center - left - x, x - center - right)
}

export function moonV2Height(x: number, z: number) {
  const {center, left, right, level} = creekSection(z)
  const west = x < center
  const edge = Math.abs(x - center) - (west ? left : right)
  const shallow = .5 + .5 * Math.sin(z * .48 + .8)
  if (edge < 0) return level - (.16 + .32 * shallow) * smooth(0, 1.15, -edge)
  const rolling = .60 + .17 * Math.sin(x * .44 + z * .22) + .13 * Math.cos(z * .54 - x * .34)
  const overlooking = Math.exp(-((x - 1.2) ** 2 / 5 + (z + 12.4) ** 2 / 9))
  const hollow = Math.exp(-((x + 11.1) ** 2 / 9 + (z + 6.5) ** 2 / 7))
  const back = smooth(15, 30, -z) * (1.2 + .43 * Math.cos(x * .28))
  const ground = rolling * (1 - overlooking * .83) + .73 * overlooking - .21 * hollow + back
  const shelf = west ? 1.82 + .47 * Math.cos(z * .33) : .95 + .31 * Math.sin(z * .35)
  return level + (ground - level) * smooth(0, shelf, edge)
}

// These are also the render anchors. Composer reserves the trunk and root footprint.
export const moonV2Trees = [
  [-2.9, 8.6, 4.8, .9], [11.8, 9.1, 5.2, 1.05], [-.3, -2.7, 5.6, 2.5],
  [11.5, -4.5, 5.3, 1.25], [-6.2, -5.1, 4.9, 1.18], [-13.9, -4.8, 5.9, 1.4],
  [-10.2, -10, 5.4, 1.25], [-15.2, -9.4, 6.2, 1.4], [-6.4, -14.7, 5.3, 1.2],
  [11.2, -15.4, 5.6, 1.2], [-1.9, -19.6, 6.3, 1.4],
] as const

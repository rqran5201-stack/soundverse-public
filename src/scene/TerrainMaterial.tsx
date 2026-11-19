import { useEffect, useMemo } from 'react'
import { DoubleSide, MeshStandardMaterial } from 'three'

export function TerrainMaterial({ coastal = false, moon = false, overlay = false }: { coastal?: boolean; moon?: boolean; overlay?: boolean }) {
  const material = useMemo(() => {
    const surface = new MeshStandardMaterial({ vertexColors: true, roughness: .96 })
    if (overlay) {
      surface.transparent = true
      surface.depthWrite = false
      surface.side = DoubleSide
    }
    surface.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec3 terrainPosition;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nterrainPosition = (modelMatrix * vec4(position, 1.0)).xyz;')
      shader.fragmentShader = 'varying vec3 terrainPosition;\n' + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        vec2 groundPoint = terrainPosition.xz;
        float groundVariation = sin(groundPoint.x * 2.8 + sin(groundPoint.y * 1.7)) *
          cos(groundPoint.y * 3.1 - groundPoint.x * 1.1);
        float grain = sin(groundPoint.x * 39.0 + sin(groundPoint.y * 25.0)) *
          cos(groundPoint.y * 41.0);
        float distanceFade = 1.0 - smoothstep(5.0, 28.0, distance(cameraPosition, terrainPosition));
        ${moon ? 'grain *= 1.0 - smoothstep(0.045, 0.17, length(fwidth(groundPoint)));' : ''}
        diffuseColor.rgb *= 0.96 + groundVariation * 0.085 + grain * distanceFade * 0.055;
        ${moon ? `
          float leafLitter = sin(groundPoint.x * 7.3 + sin(groundPoint.y * 5.4)) *
            cos(groundPoint.y * 6.7 + groundPoint.x * 3.6);
          float mossPatch = smoothstep(-0.38, 0.66,
            sin(groundPoint.x * 0.49 + sin(groundPoint.y * 0.37)) * cos(groundPoint.y * 0.58));
          float gaps = sin(groundPoint.x * 1.36 - groundPoint.y * 0.67) *
            sin(groundPoint.y * 1.1 + 0.4 * sin(groundPoint.x * 2.07));
          float dapple = smoothstep(0.19, 0.84, gaps);
          diffuseColor.rgb *= mix(vec3(1.07, 0.96, 0.86), vec3(0.89, 1.02, 1.01), mossPatch);
          vec2 clearingOffset = (groundPoint - vec2(-11.1, -6.5)) * vec2(0.71, 0.46);
          vec2 shoreOffset = (groundPoint - vec2(1.8, -10.8)) * vec2(0.84, 0.36);
          float moonPool = exp(-dot(clearingOffset, clearingOffset)) * .34 +
            exp(-dot(shoreOffset, shoreOffset)) * .24;
          diffuseColor.rgb *= 0.86 + 0.21 * dapple + (0.12 * leafLitter + 0.03 * grain) * distanceFade;
          diffuseColor.rgb += vec3(.102, .135, .151) * moonPool * (.64 + .36 * dapple);
          float bankX = groundPoint.x - (6.6 + 1.5 * sin(groundPoint.y * .15));
          float banks = 1.0 - smoothstep(.87, 1.95,
            abs(bankX + .24 * sin(groundPoint.y * 1.23) + .12 * cos(groundPoint.y * 2.71 + bankX)));
          float wetBank = banks * (1.0 - smoothstep(-.26, .28, terrainPosition.y));
          float speckles = smoothstep(.16, .72, leafLitter * distanceFade);
          vec3 wetEarth = mix(vec3(.031, .039, .030), vec3(.067, .081, .059), mossPatch * .8);
          diffuseColor.rgb = mix(diffuseColor.rgb, wetEarth + speckles * vec3(.029, .031, .025), wetBank * .86);
          ${overlay ? 'diffuseColor.a *= 0.82 + 0.18 * leafLitter;' : ''}
        ` : ''}
        ${coastal ? 'float wetEdge = 1.0 - smoothstep(-0.25, 0.13, terrainPosition.y); diffuseColor.rgb *= mix(1.0, 0.69, wetEdge);' : ''}
      `)
    }
    surface.customProgramCacheKey = () => `terrain-${coastal}-${moon}-${overlay}`
    return surface
  }, [coastal, moon, overlay])
  useEffect(() => () => material.dispose(), [material])
  return <primitive object={material} attach="material" />
}


import ShaderUtils from "../shader-utils";

/**
 * @author aeroheim / http://aeroheim.moe/
 */

const GlitchShader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    resolution: { value: null },
    amount: { value: 0 },
    seed: { value: 1.0 },
  },

  vertexShader: `

    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }

  `,

  fragmentShader: `

    ${ShaderUtils.noiseHelpers}

    uniform sampler2D tDiffuse1;
    uniform sampler2D tDiffuse2;
    uniform float amount;
    uniform float seed;
    uniform vec2 resolution;
    varying vec2 vUv;

    vec2 tile(vec2 position, float size, float scale) {
      vec2 tileSize = vec2(size / resolution.x * scale, size / resolution.y);
      return tileSize * floor(position / tileSize);
    }

    float glitchNoise(vec2 position, float glitch, float seed) {
      // the glitch affects the seeds used for perlin noise and the multipliers for each type of glitch
      float noise = 0.0;

      // large rectangular glitch blocks
      noise += max(snoise(tile(vUv, 488.0, 15.0) * (1.0 + glitch * seed * 8.0)) * glitch - 0.5, 0.0);

      // medium square glitch blocks
      noise += max(snoise(tile(vUv, 100.0, 1.0) * (4.0 + glitch * seed * 2.0)) * glitch - 0.3, 0.0);

      // medium rectangular glitch blocks
      noise += max(snoise(tile(vUv, 120.0, 8.0) * (4.0 + glitch * seed * 4.0)) * glitch - 0.2, 0.0);
      noise += max(snoise(tile(vUv, 125.0, 8.0) * (4.0 + glitch * seed * 4.0)) * glitch - 0.2, 0.0);

      // small rectangular glitch blocks
      noise += max(snoise(tile(vUv, 29.0, 16.0) * (4.0 + glitch * seed * 2.0)) * glitch - 0.2, 0.0);

      // small square glitch blocks
      noise += max(snoise(tile(vUv, 29.0, 1.0) * (8.0 + glitch * seed * 2.0)) * glitch - 0.7, 0.0);
  
      // thin glitch lines - fill existing glitch blocks
      if (noise >= 0.6) {
        noise += max(snoise(tile(vUv, 1.1, 1000.0) * 1000.0) * glitch, 0.0);
      }
      // thin glitch lines - fill remaining empty space
      if (noise <= 0.0) {
        float lineNoise = max(snoise(tile(vUv, 1.1, 500.0) * (500.0 + glitch * seed * 100.0)) * glitch, 0.0);
        lineNoise += min(snoise(tile(vUv, 100.0, 3.0) * (4.0 + glitch * seed * 2.0)) * glitch, 0.0);
        noise += max(lineNoise, 0.0);
      }

      // coerce to max glitch amount
      float glitchCoerceThreshold = 0.9;
      if (amount >= glitchCoerceThreshold) {
        float percent = (amount - glitchCoerceThreshold) / (1.0 - glitchCoerceThreshold);
        return noise + (1.0 * percent);
      }

      return noise;
    }

    vec4 rgbShift(sampler2D tex, vec2 position, vec3 offset) {
      vec4 r = texture2D(tex, position + vec2(offset.r, 0.0));
      vec4 g = texture2D(tex, position + vec2(offset.g, 0.0));
      vec4 b = texture2D(tex, position + vec2(offset.b, 0.0));
      return vec4(r.r, g.g, b.b, 1.0);
    }

    void main() {
      float glitch = glitchNoise(vUv, amount, seed);
      
      vec3 rgbShiftOffset = vec3(0.01, 0.0, -0.01);
      vec4 texel1 = texture2D(tDiffuse1, vUv);
      vec4 shiftedTexel1 = rgbShift(tDiffuse1, vUv, rgbShiftOffset);
      vec4 texel2 = texture2D(tDiffuse2, vUv);
      vec4 shiftedTexel2 = rgbShift(tDiffuse2, vUv, rgbShiftOffset);

      vec4 color = texel1;
      if (glitch >= 0.95) {
        // no glitching
        color = texel2;
      } else if (glitch >= 0.7) {
        // color-shifted new texture
        color = shiftedTexel2;
      } else if (glitch >= 0.6) {
        // color-shifted original texture
        color = shiftedTexel1;
      } else if (glitch >= 0.5) {
        // magenta glitch blocks
        color = texel1 * vec4(1.2, 0.0, 1.2, 0.5);
      } else if (glitch >= 0.4) {
        // cyan glitch blocks
        color = texel1 * vec4(0.0, 1.2, 1.2, 0.5);
      } else if (glitch >= 0.2) {
        // color-shifted original texture
        color = shiftedTexel1;
      }

      gl_FragColor = color;
    }

  `,
};

export {
  GlitchShader,
};

export default GlitchShader;

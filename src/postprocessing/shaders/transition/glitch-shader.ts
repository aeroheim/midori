import { Shader } from 'three';

/**
 * @author aeroheim / http://aeroheim.moe/
 */

/*
 * Helper functions to generate noise.
 * See https://github.com/ashima/webgl-noise/wiki by Stefan Gustavson.
 */
const noiseHelpers = `

//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
// 

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                    -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
// First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

// Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

// Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

// Gradients: 41 points uniformly over a line, mapped onto a diamond.
// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

// Normalise gradients implicitly by scaling m
// Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

// Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

`;

const GlitchShader: Shader = {
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

    ${noiseHelpers}

    uniform sampler2D tDiffuse1;
    uniform sampler2D tDiffuse2;
    uniform float amount;
    uniform float seed;
    uniform vec2 resolution;
    varying vec2 vUv;

    vec2 tile(vec2 position, vec2 resolution, float size, float scale) {
      vec2 tileSize = vec2(size / resolution.x * scale, size / resolution.y);
      return tileSize * floor(position / tileSize);
    }

    float glitchNoise(vec2 position, vec2 resolution, float amount, float seed) {
      // the amount affects the seeds used for noise and the multipliers for each type of glitch
      float noise = 0.0;

      // large rectangular glitch blocks
      noise += max(snoise(tile(position, resolution, 488.0, 15.0) * (1.0 + amount * seed * 8.0)) * amount - 0.5, 0.0);

      // medium square glitch blocks
      noise += max(snoise(tile(position, resolution, 100.0, 1.0) * (4.0 + amount * seed * 2.0)) * amount - 0.3, 0.0);

      // medium rectangular glitch blocks
      noise += max(snoise(tile(position, resolution, 120.0, 8.0) * (4.0 + amount * seed * 4.0)) * amount - 0.2, 0.0);
      noise += max(snoise(tile(position, resolution, 125.0, 8.0) * (4.0 + amount * seed * 4.0)) * amount - 0.2, 0.0);

      // small rectangular glitch blocks
      noise += max(snoise(tile(position, resolution, 29.0, 16.0) * (4.0 + amount * seed * 2.0)) * amount - 0.2, 0.0);

      // small square glitch blocks
      noise += max(snoise(tile(position, resolution, 29.0, 1.0) * (8.0 + amount * seed * 2.0)) * amount - 0.7, 0.0);

      if (noise >= 0.6) {
        // thin glitch lines - fill existing glitch blocks
        noise += max(snoise(tile(position, resolution, 1.1, 1000.0) * 1000.0) * amount, 0.0);
      } else if (noise <= 0.0) {
        // thin glitch lines - fill remaining empty space
        float lineNoise = max(snoise(tile(position, resolution, 1.1, 500.0) * (500.0 + amount * seed * 100.0)) * amount, 0.0);
        lineNoise += min(snoise(tile(position, resolution, 100.0, 3.0) * (4.0 + amount * seed * 2.0)) * amount, 0.0);
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
      float glitch = glitchNoise(vUv, resolution, amount, seed);

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
      } else if (glitch >= 0.38) {
        // bright color-shifted new texture
        color = shiftedTexel2 * 1.5;
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

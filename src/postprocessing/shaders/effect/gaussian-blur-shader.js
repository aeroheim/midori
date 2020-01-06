/* eslint-disable indent */
/**
 * @author aeroheim / http://aeroheim.moe/
 *
 * A 9-tap two-pass gaussian blur filter based off of:
 * http://rastergrid.com/blog/2010/09/efficient-gaussian-blur-with-linear-sampling/
 *
 * Also based off of the following implementation:
 * https://github.com/mattdesl/lwjgl-basics/wiki/ShaderLesson5
 *
 */

const GaussianBlurDirection = Object.freeze({
  HORIZONTAL: [1.0, 0.0],
  VERTICAL: [0.0, 1.0],
});

const GaussianBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    radius: { value: 1.0 },
    resolution: { value: [0.0, 0.0] },
    direction: { value: [0.0, 0.0] },
  },

  vertexShader: [

    'varying vec2 vUv;',

    'void main() {',
    ' vUv = uv;',
    ' gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}',

  ].join('\n'),

  fragmentShader: [

    'uniform sampler2D tDiffuse;',
    'uniform float radius;',
    'uniform vec2 resolution;',
    'uniform vec2 direction;',
    'varying vec2 vUv;',

    'void main() {',
    ' float blur = radius / resolution;',
    ' float h = direction.x;',
    ' float v = direction.y;',

    ' sum = vec4(0.0);',

      // blur with 9-tap filter using precomputed gaussian weights
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 4.0 * blur * h, vUv.y - 4.0 * blur * v)) * 0.01621621621;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 3.0 * blur * h, vUv.y - 4.0 * blur * v)) * 0.05405405405;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 2.0 * blur * h, vUv.y - 4.0 * blur * v)) * 0.12162162162;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 1.0 * blur * h, vUv.y - 4.0 * blur * v)) * 0.19459459459;',

    ' sum += texture2D(tDiffuse, vUv) * 0.22702702702;',

    ' sum += texture2D(tDiffuse, vec2(vUv.x + 1.0 * blur * h, vUv.y + 4.0 * blur * v)) * 0.19459459459;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 2.0 * blur * h, vUv.y + 4.0 * blur * v)) * 0.12162162162;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 3.0 * blur * h, vUv.y + 4.0 * blur * v)) * 0.05405405405;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 4.0 * blur * h, vUv.y + 4.0 * blur * v)) * 0.01621621621;',

    ' gl_FragColor = sum;',
    '}',

  ].join('\n'),
};

export {
  GaussianBlurShader,
  GaussianBlurDirection,
};

export default GaussianBlurShader;

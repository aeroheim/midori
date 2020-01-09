/* eslint-disable indent */
/**
 * @author aeroheim / http://aeroheim.moe/
 *
 * A two-pass gaussian blur that uses a 17-tap filter based off of:
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
    // the radius of the blur - determines the offset distance for each tap
    radius: { value: 1.0 },
    // the length of the direction to be blurred (i.e width or height of texture)
    resolution: { value: 0.0 },
    // the direction of the blur
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
    'uniform float resolution;',
    'uniform vec2 direction;',
    'varying vec2 vUv;',

    'void main() {',
    ' float blur = radius / resolution;',
    ' float h = direction.x;',
    ' float v = direction.y;',

    ' vec4 sum = vec4(0.0);',

      // blur with 17-tap filter using precomputed gaussian weights
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 8.0 * blur * h, vUv.y - 8.0 * blur * v)) * 0.00018120537;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 7.0 * blur * h, vUv.y - 7.0 * blur * v)) * 0.00108723226;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 6.0 * blur * h, vUv.y - 6.0 * blur * v)) * 0.00462073714;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 5.0 * blur * h, vUv.y - 5.0 * blur * v)) * 0.01478635885;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 4.0 * blur * h, vUv.y - 4.0 * blur * v)) * 0.03696589714;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 3.0 * blur * h, vUv.y - 3.0 * blur * v)) * 0.07393179429;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 2.0 * blur * h, vUv.y - 2.0 * blur * v)) * 0.12013916573;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 1.0 * blur * h, vUv.y - 1.0 * blur * v)) * 0.1601855543;',

    ' sum += texture2D(tDiffuse, vUv) * 0.17620410973;',

    ' sum += texture2D(tDiffuse, vec2(vUv.x + 1.0 * blur * h, vUv.y + 1.0 * blur * v)) * 0.1601855543;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 2.0 * blur * h, vUv.y + 2.0 * blur * v)) * 0.12013916573;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 3.0 * blur * h, vUv.y + 3.0 * blur * v)) * 0.07393179429;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 4.0 * blur * h, vUv.y + 4.0 * blur * v)) * 0.03696589714;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 5.0 * blur * h, vUv.y + 5.0 * blur * v)) * 0.01478635885;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 6.0 * blur * h, vUv.y + 6.0 * blur * v)) * 0.00462073714;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 7.0 * blur * h, vUv.y + 7.0 * blur * v)) * 0.00108723226;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 8.0 * blur * h, vUv.y + 8.0 * blur * v)) * 0.00018120537;',

    ' gl_FragColor = sum;',
    '}',

  ].join('\n'),
};

export {
  GaussianBlurShader,
  GaussianBlurDirection,
};

export default GaussianBlurShader;

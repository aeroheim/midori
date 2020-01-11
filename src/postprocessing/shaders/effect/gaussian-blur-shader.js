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

    // optimized 33-tap filter that takes advantage of bilinear filtering (effectively 17 fetches)
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 15.0810810809 * blur * h, vUv.y - 15.0810810809 * blur * v)) * 1.13068382e-7;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 13.1351352551 * blur * h, vUv.y - 13.1351352551 * blur * v)) * 0.00000634313;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 11.1891891693 * blur * h, vUv.y - 11.1891891693 * blur * v)) * 0.00014981883;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 9.2432432422 * blur * h, vUv.y - 9.2432432422 * blur * v)) * 0.00181031093;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 7.29729729717 * blur * h, vUv.y - 7.29729729717 * blur * v)) * 0.01244177332;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 5.35135135135 * blur * h, vUv.y - 5.35135135135 * blur * v)) * 0.0518407222;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 3.40540540538 * blur * h, vUv.y - 3.40540540538 * blur * v)) * 0.13626704123;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x - 1.45945945945 * blur * h, vUv.y - 1.45945945945 * blur * v)) * 0.23145357738;',

    ' sum += texture2D(tDiffuse, vUv) * 0.13206059971;',

    ' sum += texture2D(tDiffuse, vec2(vUv.x + 1.45945945945 * blur * h, vUv.y + 1.45945945945 * blur * v)) * 0.23145357738;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 3.40540540538 * blur * h, vUv.y + 3.40540540538 * blur * v)) * 0.13626704123;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 5.35135135135 * blur * h, vUv.y + 5.35135135135 * blur * v)) * 0.0518407222;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 7.29729729717 * blur * h, vUv.y + 7.29729729717 * blur * v)) * 0.01244177332;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 9.2432432422 * blur * h, vUv.y + 9.2432432422 * blur * v)) * 0.00181031093;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 11.1891891693 * blur * h, vUv.y + 11.1891891693 * blur * v)) * 0.00014981883;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 13.1351352551 * blur * h, vUv.y + 13.1351352551 * blur * v)) * 0.00000634313;',
    ' sum += texture2D(tDiffuse, vec2(vUv.x + 15.0810810809 * blur * h, vUv.y + 15.0810810809 * blur * v)) * 1.13068382e-7;',

    ' gl_FragColor = sum;',
    '}',

  ].join('\n'),
};

export {
  GaussianBlurShader,
  GaussianBlurDirection,
};

export default GaussianBlurShader;

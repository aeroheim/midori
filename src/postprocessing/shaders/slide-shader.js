/**
 * @author aeroheim / http://aeroheim.moe/
 */

const SlideShader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    blend: { value: 0.0 },
    // a positive value indicating the amount to slide
    amount: { value: 0.0 },
    // a positive value that affects the intensity of the blur
    intensity: { value: 0.0 },
  },

  vertexShader: [

    'varying vec2 vUv;',

    'void main() {',
    ' vUv = uv;',
    ' gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}',

  ].join('\n'),

  fragmentShader: [

    'uniform sampler2D tDiffuse1;',
    'uniform sampler2D tDiffuse2;',
    'uniform float blend;',
    'uniform float amount;',
    'uniform float intensity;',
    'varying vec2 vUv;',

    'void main() {',
    ' vec4 texel1 = texture2D(tDiffuse1, vUv);',
    ' vec4 texel2 = texture2D(tDiffuse2, vUv);',
    ' vec2 position = vUv;',
    ' position.x = abs((position.x + amount) - 1.0) < .000001 ? 1.0 : (position.x + amount) - (1.0 * floor((position.x + amount) / 1.0));',
    ' gl_FragColor = texture2D(tDiffuse2, position);',
    // ' gl_FragColor = mix(texel1, texel2, amount);',
    '}',

  ].join('\n'),
};

export {
  SlideShader,
};

export default SlideShader;

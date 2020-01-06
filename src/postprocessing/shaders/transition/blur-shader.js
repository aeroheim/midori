/**
 * @author aeroheim / http://aeroheim.moe/
 */

const BlurShader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    // a value from 0 to 1 indicating the blend ratio for both textures
    amount: { value: 0.0 },
    // the amount value of the previous frame - used to calculate the velocity for the blur
    prevAmount: { value: 0.0 },
    // a positive value that affects the intensity of the blur
    intensity: { value: 1.0 },
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
    'uniform float amount;',
    'uniform float prevAmount;',
    'uniform float intensity;',
    'varying vec2 vUv;',

    'void main() {',
    ' vec4 texel = mix(texture2D(tDiffuse1, vUv), texture2D(tDiffuse2, vUv), amount);',
    ' float velocity = (amount - prevAmount) * intensity;',
    ' const int numSamples = 100;',
    ' for (int i = 1; i < numSamples; ++i) {',
    '   float offset = velocity * (float(i) / float(numSamples - 1) - 0.5);',
    '   texel += mix(texture2D(tDiffuse1, vec2(vUv.x + offset, vUv.y)), texture2D(tDiffuse2, vec2(vUv.x + offset, vUv.y)), amount);',
    ' }',

    ' gl_FragColor = texel / max(1.0, float(numSamples));',
    '}',

  ].join('\n'),
};

export {
  BlurShader,
};

export default BlurShader;

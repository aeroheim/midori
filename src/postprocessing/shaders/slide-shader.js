/**
 * @author aeroheim / http://aeroheim.moe/
 */

const SlideShader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    slides: { value: 1.0 },
    // a positive value indicating the amount to slide
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
    'uniform int slides;',
    'uniform float amount;',
    'uniform float prevAmount;',
    'uniform float intensity;',
    'varying vec2 vUv;',

    'void main() {',
    ' float blendDistance = 0.2;',
    ' float screenRange = 1.0 - blendDistance;',

    ' float offset = amount * (float(slides) * screenRange);',
    ' vec2 position = vec2(mod(vUv.x + offset, screenRange), vUv.y);',

    // find index of current screen, apply first/last screen edge cases if necessary
    ' vec4 texel = texture2D(tDiffuse2, position);',
    ' int index = int(floor((vUv.x + offset) / screenRange));',

    ' if (position.x < blendDistance) {',
    '   if (index >= slides + 1) {',
    '     texel = texture2D(tDiffuse2, vec2((1.0 - blendDistance) + position.x, vUv.y));',
    '   } else if (index != 0) {',
    '     vec4 texel1 = texture2D(tDiffuse2, vec2((1.0 - blendDistance) + position.x, vUv.y));',
    '     vec4 texel2 = texture2D(tDiffuse2, position);',
    '     bool fadeOutBlend = int(floor((offset + screenRange + (blendDistance * 4.0)) / screenRange)) >= slides + 1;',
    '     texel = mix(texel1, texel2, fadeOutBlend',
    '       ? min(1.0, (position.x / blendDistance) / ((float(slides) * screenRange - offset) / (blendDistance * 4.0)))',
    '       : position.x / blendDistance);',
    '   }',
    ' }',

    /*
    // sample the colors to achieve blurring effect
    ' float velocity = (amount - prevAmount) * intensity;',
    ' const int numSamples = 100;',
    ' for (int i = 0; i < numSamples; ++i) {',
    '   float offset = velocity * (float(i) / float(numSamples - 1) - 0.5);',
    '   texel += texture2D(tDiffuse2, position);',
    ' }',
    */

    ' gl_FragColor = texel;',
    // ' gl_FragColor = texture2D(tDiffuse2, position);',
    // ' gl_FragColor = mix(texel1, texel2, amount);',
    '}',

  ].join('\n'),
};

export {
  SlideShader,
};

export default SlideShader;

/* eslint-disable indent */
/**
 * @author aeroheim / http://aeroheim.moe/
 */

const SlideDirection = Object.freeze({
  LEFT: 0,
  RIGHT: 1,
  TOP: 2,
  BOTTOM: 3,
});

const SlideShader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    slides: { value: 1.0 },
    // an value from 0 to 1 indicating the slide ratio
    amount: { value: 0.0 },
    // the amount value of the previous frame - used to calculate the velocity for the blur
    prevAmount: { value: 0.0 },
    // an value from 0 to 1 indicating the size of the blend gradient
    gradient: { value: 0.0 },
    // a positive value that affects the intensity of the slide blur
    intensity: { value: 1.0 },
    // the direction to slide to
    direction: { value: SlideDirection.RIGHT },
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
    'uniform float gradient;',
    'uniform float intensity;',
    'uniform int direction;',
    'varying vec2 vUv;',

    'float getComponentForDirection(int direction, vec2 uv) {',
    ' return direction < 2 ? uv.x : uv.y;',
    '}',

    'vec2 getVectorForDirection(int direction, vec2 uv, float position) {',
    ' return direction < 2 ? vec2(position, uv.y) : vec2(uv.x, position);',
    '}',

    'vec4 getTexelForPosition(vec2 uv, float amount, int slides, float gradient, int direction) {',
    ' float slideLength = 1.0 - gradient;',
    ' float slideOffsetRange = float(slides) * slideLength;',
    ' float slideOffset = amount * slideOffsetRange;',
    ' float slidePosition = getComponentForDirection(direction, uv) + slideOffset;',
    ' int slideIndex = int(floor(slidePosition / slideLength));',

    ' float position = mod(slidePosition, slideLength);', // TODO: mod will rollover position values early - implement our own mod function instead
    ' vec2 texelCoords = getVectorForDirection(direction, uv, position);',

      // the position is within a blend section between two slides
    ' if (position < gradient) {',
    '   vec2 texelBlendCoords = getVectorForDirection(direction, uv, (1.0 - gradient) + position);',
        // special case for final slide
    '   if (slideIndex >= slides + 1) {',
    '     return mix(texture2D(tDiffuse1, texelBlendCoords), texture2D(tDiffuse2, texelBlendCoords), amount);',
    '   }',

        // case for in-between slides
    '   if (slideIndex != 0) {',
          // fade out the blend section leading up the final slide
    '     float fadeDistance = gradient * 4.0;',
    '     bool fade = int(floor((slideOffset + slideLength + fadeDistance) / slideLength)) >= slides + 1;',
    '     float blendRatio = position / gradient;',
    '     blendRatio = fade ? min(blendRatio / ((slideOffsetRange - slideOffset) / fadeDistance), 1.0) : blendRatio;',
    '     vec4 texel1 = mix(texture2D(tDiffuse1, texelBlendCoords), texture2D(tDiffuse1, texelCoords), blendRatio);',
    '     vec4 texel2 = mix(texture2D(tDiffuse2, texelBlendCoords), texture2D(tDiffuse2, texelCoords), blendRatio);',
    '     return mix(texel1, texel2, amount);',
    '   }',
    ' }',

    ' return mix(texture2D(tDiffuse1, texelCoords), texture2D(tDiffuse2, texelCoords), amount);',
    '}',

    'void main() {',
    ' vec4 texel = getTexelForPosition(vUv, amount, slides, gradient, direction);',

    ' float velocity = (amount - prevAmount) * intensity;',
    ' const int numSamples = 100;',
    ' for (int i = 0; i < numSamples; ++i) {',
    '   float offset = velocity * (float(i) / float(numSamples - 1) - 0.5);',
    '   texel += getTexelForPosition(vec2(vUv.x + offset, vUv.y), amount, slides, gradient, direction);',
    ' }',

    ' gl_FragColor = texel / max(1.0, float(numSamples));',
    '}',

  ].join('\n'),
};

export {
  SlideShader,
  SlideDirection,
};

export default SlideShader;

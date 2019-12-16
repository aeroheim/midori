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
    'uniform float intensity;',
    'uniform int direction;',
    'varying vec2 vUv;',

    'float getComponentForDirection(int direction, vec2 uv) {',
    ' return direction < 2 ? uv.x : uv.y;',
    '}',

    'vec2 getVectorForDirection(int direction, vec2 uv, float position) {',
    ' return direction < 2 ? vec2(position, uv.y) : vec2(uv.x, position);',
    '}',

    'vec4 getTexelForPosition(vec2 uv, float amount, int slides, int direction) {',
      // the gradient represents the size of the blend section between slides
    ' const float gradient = 0.2;',
      // the slide length represents the "length" of each slide - essentially the length of the uv length of the texture excluding the gradient
    ' float slideLength = 1.0 - gradient;',
      // the total uv distance to translate - determined by the number of slides and length of each slide
    ' float slideOffsetRange = float(slides) * slideLength;',
      // the current uv offset - determined by the amount value
    ' float slideOffset = amount * slideOffsetRange;',
      // the absolute uv position after factoring in the slide offset - note that this exceeds the default 0 - 1.0 uv value range
    ' float slidePosition;',
      // the current slide index out of the total number of slides that the slidePosition falls within
    ' int slideIndex;',
      // whether the slide is a special edge slide - special edge slides should not be blended
    ' bool isEdgeSlide;',
      // whether the slide is a middle slide - middle slides blend with each other to smooth out texture boundaries
    ' bool isMiddleSlide;',

    ' if (direction == 1 || direction == 2) {',
      // SlideDirection.RIGHT || SlideDirection.TOP
    '   slidePosition = getComponentForDirection(direction, uv) + slideOffset;',
    '   slideIndex = int(floor(slidePosition / slideLength));',
    '   isEdgeSlide = slideIndex == slides + 1;',
    '   isMiddleSlide = slideIndex > 0 && slideIndex <= slides;',
    ' } else if (direction == 0 || direction == 3) {',
      // SlideDirection.LEFT || SlideDirection.BOTTOM
    '   slidePosition = getComponentForDirection(direction, uv) + (slideLength - mod(slideOffset, slideLength));',
    '   slideIndex = int(floor((getComponentForDirection(direction, 1.0 - uv) + slideOffset) / slideLength));',
    '   isEdgeSlide = slideIndex == 0;',
    '   isMiddleSlide = slideIndex > 0 && slideIndex <= slides;',
    ' }',

    // the normalized 0 - 1.0 uv position after factoring in the slide offset
    ' float position = mod(slidePosition, slideLength);',
    ' vec2 texelCoords = getVectorForDirection(direction, uv, position);',
    ' vec2 texelBlendCoords = getVectorForDirection(direction, uv, slideLength + position);',

      // the position is within a blend section between two slides
    ' if (position < gradient) {',
        // the texel is within a special edge slide - don't blend the texel
    '   if (isEdgeSlide) {',
    '     return mix(texture2D(tDiffuse1, texelBlendCoords), texture2D(tDiffuse2, texelBlendCoords), amount);',
    '   }',

        // the texel is within a middle slide - blend the texel
    '   if (isMiddleSlide) {',
    '     float blendRatio = position / gradient;',

          // fade out the blend section leading up the last slide
    '     float fadeDistance = gradient * 4.0;',
    '     bool fadeOut = int(floor((slideOffset + slideLength + fadeDistance) / slideLength)) >= slides + 1;',
    '     if (fadeOut) {',
    '       blendRatio = direction == 1 || direction == 2 ',
    '         ? min(blendRatio / ((slideOffsetRange - slideOffset) / fadeDistance), 1.0)',
    '         : min(blendRatio * ((slideOffsetRange - slideOffset) / fadeDistance), 1.0);',
    '     }',

    '     vec4 texel1 = mix(texture2D(tDiffuse1, texelBlendCoords), texture2D(tDiffuse1, texelCoords), blendRatio);',
    '     vec4 texel2 = mix(texture2D(tDiffuse2, texelBlendCoords), texture2D(tDiffuse2, texelCoords), blendRatio);',
    '     return mix(texel1, texel2, amount);',
    '   }',
    ' }',

    ' return mix(texture2D(tDiffuse1, texelCoords), texture2D(tDiffuse2, texelCoords), amount);',
    '}',

    'void main() {',
    ' vec4 texel = getTexelForPosition(vUv, amount, slides, direction);',

    ' float velocity = (amount - prevAmount) * intensity;',
    ' const int numSamples = 100;',
    ' for (int i = 1; i < numSamples; ++i) {',
    '   float offset = velocity * (float(i) / float(numSamples - 1) - 0.5);',
    '   texel += getTexelForPosition(getVectorForDirection(direction, vUv, getComponentForDirection(direction, vUv) + offset), amount, slides, direction);',
    ' }',

    ' gl_FragColor = texel / max(1.0, float(numSamples));',
    // ' gl_FragColor = texel;',
    '}',

  ].join('\n'),
};

export {
  SlideShader,
  SlideDirection,
};

export default SlideShader;

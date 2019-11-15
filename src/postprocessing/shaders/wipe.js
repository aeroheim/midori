/**
 * @author aeroheim / http://aeroheim.moe/
 */

const WipeDirection = Object.freeze({
  LEFT: 0,
  RIGHT: 1,
  TOP: 2,
  BOTTOM: 3,
});

const WipeShader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    wipe: { value: 0.0 }, // a value from 0 to 1 indicating the ratio of the texture wipe
    gradient: { value: 0.0 }, // an value from 0 to 1 indicating the size of the blend gradient
    direction: { value: WipeDirection.RIGHT },
    // angle
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
    'uniform float wipe;',
    'uniform float gradient;',
    'uniform int direction;',
    'varying vec2 vUv;',

    'void main() {',
    ' vec4 texel1 = texture2D(tDiffuse1, vUv);',
    ' vec4 texel2 = texture2D(tDiffuse2, vUv);',

    ' float wipeOffset = -gradient + (1.0 + gradient) * wipe;',
    ' float gradientOffset = wipeOffset + gradient;',

    ' float position;',

    ' if (direction == 0) {',
    // WipeDirection.LEFT
    '   position = 1.0 - vUv.x;',
    ' } else if (direction == 1) {',
    // WipeDirection.RIGHT
    '   position = vUv.x;',
    ' } else if (direction == 2) {',
    // WipeDirection.TOP
    '   position = vUv.y;',
    ' } else if (direction == 3) {',
    // WipeDirection.BOTTOM
    '   position = 1.0 - vUv.y;',
    ' }',

    ' if (position <= wipeOffset) {',
    '   gl_FragColor = texel2;',
    ' } else if (position <= gradientOffset) {',
    '   gl_FragColor = mix(texel2, texel1, (position - wipeOffset) / gradient);',
    ' } else {',
    '   gl_FragColor = texel1;',
    ' }',
    '}',

  ].join('\n'),
};

export {
  WipeShader,
  WipeDirection,
};

export default WipeShader;

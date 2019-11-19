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
    angle: { value: 0.261799 },
    aspect: { value: 1.0 },
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
    'uniform float angle;',
    'uniform float aspect;',
    'varying vec2 vUv;',

    'void main() {',
    ' vec4 texel1 = texture2D(tDiffuse1, vUv);',
    ' vec4 texel2 = texture2D(tDiffuse2, vUv);',

    ' float wipeOffset = -gradient + (1.0 + gradient) * wipe;',
    ' float gradientOffset = wipeOffset + gradient;',

    ' float position;',

    // the tangent of the angle gives us the slope of the rotated line to use
    ' float slope = tan(angle);',

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

    ' if (vUv.x <= (vUv.y / slope) / aspect) {',
    '   gl_FragColor = texel2;',
    ' } else {',
    '   gl_FragColor = texel1;',
    ' }',

    /*
    ' if (position <= wipeOffset) {',
    '   gl_FragColor = texel2;',
    ' } else if (position <= gradientOffset) {',
    '   gl_FragColor = mix(texel2, texel1, (position - wipeOffset) / gradient);',
    ' } else {',
    '   gl_FragColor = texel1;',
    ' }',
    */
    '}',

  ].join('\n'),
};

export {
  WipeShader,
  WipeDirection,
};

export default WipeShader;

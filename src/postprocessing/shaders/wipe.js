/**
 * @author aeroheim / http://aeroheim.moe/
 */

const WipeDirection = Object.freeze({
  LEFT: 0,
  RIGHT: 1,
});

const WipeShader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    wipe: { value: 0.0 }, // a value from 0 to 1 indicating the ratio of the texture wipe
    gradient: { value: 0.0 }, // an value from 0 to 1 indicating the size of the blend gradient
    // direction
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
    'varying vec2 vUv;',

    'void main() {',
    ' vec4 texel1 = texture2D(tDiffuse1, vUv);',
    ' vec4 texel2 = texture2D(tDiffuse2, vUv);',

    ' float wipeOffset = -gradient + (1.0 + gradient) * wipe;',
    ' float gradientOffset = wipeOffset + gradient;',

    ' if (vUv.x <= wipeOffset) {',
    '   gl_FragColor = texel2;',
    ' } else if (vUv.x <= gradientOffset) {',
    '   gl_FragColor = mix(texel2, texel1, (vUv.x - wipeOffset) / gradient);',
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

/**
 * @author aeroheim / http://aeroheim.moe/
 */

const BlendShader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    opacity: { value: 1.0 },
  },

  vertexShader: [

    'varying vec2 vUv;',

    'void main() {',
    ' vUv = uv;',
    ' gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}',

  ].join('\n'),

  // TODO: add fade to black transitions, sliding transitions (e.g left -> right)
  fragmentShader: [

    'uniform float opacity;',
    'uniform sampler2D tDiffuse1;',
    'uniform sampler2D tDiffuse2;',
    'varying vec2 vUv;',

    'void main() {',
    ' vec4 texel1 = texture2D( tDiffuse1, vUv );',
    ' vec4 texel2 = texture2D( tDiffuse2, vUv );',
    ' gl_FragColor = mix( texel1, texel2, opacity );',
    '}',

  ].join('\n'),
};

export {
  BlendShader,
};

export default BlendShader;

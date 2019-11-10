/**
 * @author aeroheim / http://aeroheim.moe/
 */

const BlendShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDiffuseTarget: { value: null },
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
    'uniform sampler2D tDiffuse;',
    'uniform sampler2D tDiffuseTarget;',
    'varying vec2 vUv;',

    'void main() {',
    ' vec4 texel = texture2D( tDiffuse, vUv );',
    ' vec4 targetTexel = texture2D( tDiffuseTarget, vUv );',
    ' gl_FragColor = mix( texel, targetTexel, opacity );',
    '}',

  ].join('\n'),
};

export {
  BlendShader,
};

export default BlendShader;

/**
 * @author aeroheim / http://aeroheim.moe/
 *
 * Full-screen textured quad shader
 */

const CrossFadeShader = {
  uniforms: {
    tDiffuse: { value: null },
    fadeTexture: { value: null },
    opacity: { value: 1.0 },
    transition: { value: false },
  },

  vertexShader: [

    'varying vec2 vUv;',

    'void main() {',
    ' vUv = uv;',
    ' gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}',

  ].join('\n'),

  fragmentShader: [

    'uniform float opacity;',
    'uniform sampler2D tDiffuse;',
    'uniform sampler2D fadeTexture;',
    'uniform bool transition;',
    'varying vec2 vUv;',

    'void main() {',
    ' vec4 texel = texture2D( tDiffuse, vUv );',
    ' if (transition) {',
    '   vec4 fadeTexel = texture2D( fadeTexture, vUv );',
    '   gl_FragColor = mix( texel, fadeTexel, opacity );',
    ' } else {',
    '   gl_FragColor = texel;',
    ' }',
    '}',

  ].join('\n'),
};

export {
  CrossFadeShader,
};

export default CrossFadeShader;

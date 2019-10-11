/**
 * @author aeroheim / http://aeroheim.moe/
 *
 * Full-screen textured quad shader
 */

const CrossFadeShader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    mixRatio: { value: null },
    opacity: { value: 1.0 },
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

    'varying vec2 vUv;',

    'void main() {',

    ' vec4 texel = texture2D( tDiffuse, vUv );',
    ' gl_FragColor = opacity * texel;',

    '}',
  ].join('\n'),
};

export default CrossFadeShader;

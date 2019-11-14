/**
 * @author aeroheim / http://aeroheim.moe/
 */

const BlendShader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    blend: { value: 0.0 }, // a value from 0 to 1 indicating the blend ratio for both textures
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
    'uniform float blend;',
    'varying vec2 vUv;',

    'void main() {',
    ' vec4 texel1 = texture2D(tDiffuse1, vUv);',
    ' vec4 texel2 = texture2D(tDiffuse2, vUv);',
    ' gl_FragColor = mix(texel1, texel2, blend);',
    '}',

  ].join('\n'),
};

export {
  BlendShader,
};

export default BlendShader;

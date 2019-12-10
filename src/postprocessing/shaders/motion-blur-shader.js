/**
 * @author aeroheim / http://aeroheim.moe/
 * A motion blur implemention based off of GPU Gems 3: Chapter 27. Motion Blur as a Post-Processing Effect
 * https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch27.html
 */

const MotionBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    clipToWorldMatrix: { value: null },
    prevWorldToClipMatrix: { value: null },
    // a positive value that affects the intensity of the blur
    intensity: { value: 1.0 },
  },

  vertexShader: [

    'varying vec2 vUv;',

    'void main() {',
    ' vUv = uv;',
    ' gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}',

  ].join('\n'),

  fragmentShader: [

    'uniform sampler2D tDiffuse;',
    'uniform sampler2D tDepth;',
    'uniform mat4 clipToWorldMatrix;',
    'uniform mat4 prevWorldToClipMatrix;',
    'uniform float intensity;',
    'varying vec2 vUv;',

    'void main() {',
    ' float zOverW = texture2D(tDepth, vUv).x;',
    ' vec4 clipPosition = vec4(vUv.x, vUv.y, zOverW, 1.0);',
    ' vec4 worldPosition = clipToWorldMatrix * clipPosition;',
    ' worldPosition /= worldPosition.w;',

    ' vec4 prevClipPosition = prevWorldToClipMatrix * worldPosition;',
    ' prevClipPosition /= prevClipPosition.w;',
    ' vec2 velocity = (clipPosition - prevClipPosition).xy * intensity;',

    ' vec4 texel = texture2D(tDiffuse, vUv);',
    ' vec2 texelCoord = vUv;',
    ' const int numSamples = 100;',
    ' for (int i = 1; i < numSamples; ++i) {',
    // this offset calculation centers the blur which avoids unevenness favoring the direction of the velocity
    // see https://john-chapman-graphics.blogspot.com/2013/01/what-is-motion-blur-motion-pictures-are.html
    '   vec2 offset = velocity * (float(i) / float(numSamples - 1) - 0.5);',
    '   texel += texture2D(tDiffuse, vUv + offset);',
    ' }',

    ' gl_FragColor = texel / max(1.0, float(numSamples));',
    '}',

  ].join('\n'),
};

export {
  MotionBlurShader,
};

export default MotionBlurShader;

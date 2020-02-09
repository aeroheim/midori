import { Matrix4, Shader } from 'three';

/**
 * @author aeroheim / http://aeroheim.moe/
 *
 * A motion blur implemention based off of GPU Gems 3: Chapter 27. Motion Blur as a Post-Processing Effect:
 * https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch27.html
 *
 * Also based off of an implementation by John Chapman:
 * https://john-chapman-graphics.blogspot.com/2013/01/what-is-motion-blur-motion-pictures-are.html
 *
 */

const MotionBlurShader: Shader = {
  uniforms: {
    tDiffuse: { value: null },
    // a depth buffer of the frame to be blurred
    tDepth: { value: null },
    // the clip -> world matrix of the current frame - used to calculate the velocity of the blur
    clipToWorldMatrix: { value: new Matrix4() },
    // the world -> clip matrix of the previous frame - used to calculate the velocity of the blur
    prevWorldToClipMatrix: { value: new Matrix4() },
    // a positive value that affects the intensity of the blur
    intensity: { value: 1.0 },
    // the number of samples to use (up to 128) - higher samples result in better quality at the cost of performance
    samples: { value: 32 },
  },

  vertexShader: `

    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }

  `,

  fragmentShader: `

    const int MAX_SAMPLES = 128;

    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform mat4 clipToWorldMatrix;
    uniform mat4 prevWorldToClipMatrix;
    uniform float intensity;
    uniform int samples;
    varying vec2 vUv;

    void main() {
      float zOverW = texture2D(tDepth, vUv).x;
      vec4 clipPosition = vec4(vUv.x, vUv.y, zOverW, 1.0);
      vec4 worldPosition = clipToWorldMatrix * clipPosition;
      worldPosition /= worldPosition.w;

      vec4 prevClipPosition = prevWorldToClipMatrix * worldPosition;
      prevClipPosition /= prevClipPosition.w;
      vec2 velocity = ((clipPosition - prevClipPosition).xy + (clipPosition - prevClipPosition).zz) * intensity;

      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 texelCoord = vUv;
      for (int i = 1; i < MAX_SAMPLES; ++i) {
        if (i >= samples) {
          // hack to allow loop comparisons against uniforms
          break;
        }
        // this offset calculation centers the blur which avoids unevenness favoring the direction of the velocity
        vec2 offset = velocity * (float(i) / float(samples - 1) - 0.5);
        texel += texture2D(tDiffuse, vUv + offset);
      }

      gl_FragColor = texel / max(1.0, float(samples));
    }

  `,
};

export {
  MotionBlurShader,
};

export default MotionBlurShader;

import { Shader } from 'three';

/**
 * @author aeroheim / http://aeroheim.moe/
 */

const VignetteBlendShader: Shader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    size: { value: 1.0 },
  },

  vertexShader: `

    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }

  `,

  fragmentShader: `

    uniform sampler2D tDiffuse1;
    uniform sampler2D tDiffuse2;
    uniform float size;
    varying vec2 vUv;

    void main() {
      vec2 uv = (vUv - vec2(0.5));
      float mixRatio = smoothstep(0.0, 1.0, min(dot(uv, uv) * size, 1.0));
      gl_FragColor = mix(texture2D(tDiffuse1, vUv), texture2D(tDiffuse2, vUv), mixRatio);
    }

  `,
};

export {
  VignetteBlendShader,
};

export default VignetteBlendShader;

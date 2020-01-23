/**
 * @author aeroheim / http://aeroheim.moe/
 */

const VignetteBlendShader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    size: { value: 1.0 },
    opacity: { value: 1.0 },
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
    uniform float opacity;
    varying vec2 vUv;

    void main() {
      vec4 texel1 = texture2D(tDiffuse1, vUv);
      vec4 texel2 = texture2D(tDiffuse2, vUv);
      // texel2 = vec4(1.0, 0.0, 0.0, 1.0);

      vec2 uv = (vUv - vec2(0.5));
      gl_FragColor = mix(texel1, texel2, min(dot(uv, uv) * size, 1.0));
    }

  `,
};

export {
  VignetteBlendShader,
};

export default VignetteBlendShader;

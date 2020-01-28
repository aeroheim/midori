/**
 * @author aeroheim / http://aeroheim.moe/
 */

const GlitchShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: null },
    size: { value: 24.0 },
  },

  vertexShader: `

    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }

  `,

  fragmentShader: `

    uniform sampler2D tDiffuse;
    uniform float size;
    uniform vec2 resolution;
    varying vec2 vUv;

    void main() {
      vec2 dxy = size / resolution;
      vec2 coord = dxy * floor(vUv / dxy);
      gl_FragColor = texture2D(tDiffuse, coord);
    }

  `,
};

export {
  GlitchShader,
};

export default GlitchShader;

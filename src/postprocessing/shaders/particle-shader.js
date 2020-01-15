import { Color } from 'three';

/**
 * @author aeroheim / http://aeroheim.moe/
 */

const ParticleShader = {
  uniforms: {
    // a value from 0 to 1 indicating the diameter of the particle
    diameter: { value: 1.0 },
    // a value from 0 to 1 indicating the size of the blend gradient
    gradient: { value: 0.0 },
    // a value from 0 to 1 indicating the opacity of the particle
    opacity: { value: 1.0 },
    // the color of the particle
    color: { value: new Color(0xffffff) },
  },

  vertexShader: `

    attribute float size;

    void main() {
      gl_PointSize = size;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }

  `,

  fragmentShader: `

    uniform float diameter;
    uniform float gradient;
    uniform float opacity;
    uniform vec3 color;

    void main() {
      float radius = diameter / 2.0;
      float distanceFromCenter = length(gl_PointCoord - vec2(0.5, 0.5));
      if (distanceFromCenter > radius) {
        discard;
      }
      gl_FragColor = vec4(color, min((radius - distanceFromCenter) / (gradient * radius), 1.0) * opacity);
    }

  `,
};

export {
  ParticleShader,
};

export default ParticleShader;

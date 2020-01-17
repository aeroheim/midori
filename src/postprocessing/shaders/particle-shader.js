import { Color } from 'three';

/**
 * @author aeroheim / http://aeroheim.moe/
 */

const ParticleShader = {
  uniforms: {},

  vertexShader: `

    attribute float size;
    
    // a value from 0 to 1 indicating the diameter of the particle
    attribute float diameter;
    varying float v_diameter;

    // a value from 0 to 1 indicating the size of the blend gradient
    attribute float gradient;
    varying float v_gradient;

    // a value from 0 to 1 indicating the opacity of the particle
    attribute float opacity;
    varying float v_opacity;

    // the color of the particle
    attribute vec3 color;
    varying vec3 v_color;

    void main() {
      v_diameter = diameter;
      v_gradient = gradient;
      v_opacity = opacity;
      v_color = color;
      
      gl_PointSize = size;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }

  `,

  fragmentShader: `

    varying float v_diameter;
    varying float v_gradient;
    varying float v_opacity;
    varying vec3 v_color;

    void main() {
      float radius = v_diameter / 2.0;
      float distanceFromCenter = length(gl_PointCoord - vec2(0.5, 0.5));
      if (distanceFromCenter > radius) {
        discard;
      }
      gl_FragColor = vec4(v_color, min((radius - distanceFromCenter) / (v_gradient * radius), 1.0) * v_opacity);
    }

  `,
};

export {
  ParticleShader,
};

export default ParticleShader;

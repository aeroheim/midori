import { Shader } from 'three';

/**
 * @author aeroheim / http://aeroheim.moe/
 */

export enum WipeDirection {
  Left = 0,
  Right = 1,
  Top = 2,
  Bottom = 3,
}

const WipeShader: Shader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    // a value from 0 to 1 indicating the ratio of the texture wipe
    amount: { value: 0.0 },
    // a value from 0 to 1 indicating the size of the blend gradient
    gradient: { value: 0.0 },
    // the direction to wipe to
    direction: { value: WipeDirection.Right },
    // the angle of the wipe
    angle: { value: 0.0 },
    // the aspect ratio of the texture. required using an angle
    aspect: { value: 1.0 },
  },

  vertexShader: `

    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }

  `,

  // TODO: refactor and reduce branching for performance
  fragmentShader: `

    uniform sampler2D tDiffuse1;
    uniform sampler2D tDiffuse2;
    uniform float amount;
    uniform float gradient;
    uniform int direction;
    uniform float angle;
    uniform float aspect;
    varying vec2 vUv;

    void main() {
      vec4 texel1 = texture2D(tDiffuse1, vUv);
      vec4 texel2 = texture2D(tDiffuse2, vUv);

      float position;
      if (direction == 0) {
        // WipeDirection.LEFT
        position = 1.0 - vUv.x;
      } else if (direction == 1) {
        // WipeDirection.RIGHT
        position = vUv.x;
      } else if (direction == 2) {
        // WipeDirection.TOP
        position = vUv.y;
      } else if (direction == 3) {
        // WipeDirection.BOTTOM
        position = 1.0 - vUv.y;
      }

      float rotationOffset;
      float rotatedPosition;
      if (direction < 2) {
        // rotation for horizontal wipes
        float slope = 1.0 / tan(angle);
        rotationOffset = (1.0 / slope) / aspect;
        rotatedPosition = (vUv.y / slope) / aspect;
      } else {
        // rotation for vertical wipes
        float slope = tan(angle);
        rotationOffset = slope / aspect;
        rotatedPosition = (vUv.x * slope) / aspect;
      }

      // a tween that starts from one side of the texture and ends at the other side.
      // this tween accounts for offsets due to the size of the blend gradient and angle of the wipe effect.
      float wipeOffset = (-max(0.0, rotationOffset) - gradient) + ((1.0 + abs(rotationOffset) + gradient) * amount) + rotatedPosition;
      if (position <= wipeOffset) {
        gl_FragColor = texel2;
      } else if (position <= wipeOffset + gradient) {
        gl_FragColor = mix(texel2, texel1, (position - wipeOffset) / gradient);
      } else {
        gl_FragColor = texel1;
      }
    }

  `,
};

export {
  WipeShader,
};

export default WipeShader;

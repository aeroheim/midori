/**
 * @author aeroheim / http://aeroheim.moe/
 */

const SlideDirection = Object.freeze({
  LEFT: 0,
  RIGHT: 1,
  TOP: 2,
  BOTTOM: 3,
});

const SlideTransitionShader = {
  uniforms: {
    tDiffuse1: { value: null },
    tDiffuse2: { value: null },
    // the number of slides to perform
    slides: { value: 1.0 },
    // a value from 0 to 1 indicating the slide ratio
    amount: { value: 0.0 },
    // the amount value of the previous frame - used to calculate the velocity for the blur
    prevAmount: { value: 0.0 },
    // an value from 0 to 1 indicating the size of the blend gradient
    gradient: { value: 0.0 },
    // a positive value that affects the intensity of the blur
    intensity: { value: 1.0 },
    // the direction to slide to
    direction: { value: SlideDirection.RIGHT },
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

  // TODO: refactor and reduce branching for performance
  fragmentShader: `

    const int MAX_SAMPLES = 128;

    uniform sampler2D tDiffuse1;
    uniform sampler2D tDiffuse2;
    uniform int slides;
    uniform float amount;
    uniform float prevAmount;
    uniform float intensity;
    uniform int direction;
    uniform int samples;
    varying vec2 vUv;

    float getComponentForDirection(int direction, vec2 uv) {
      return direction < 2 ? uv.x : uv.y;
    }

    vec2 getVectorForDirection(int direction, vec2 uv, float position) {
      return direction < 2 ? vec2(position, uv.y) : vec2(uv.x, position);
    }

    float getOffsetPosition(int direction, float uv, float offset) {
      return direction == 1 || direction == 3
        ? mod(uv + offset, 1.0)
        : mod(uv + (1.0 - offset), 1.0);
    }

    void main() {
      vec4 texel;
      float offset = amount * float(slides);
      float position = getComponentForDirection(direction, vUv);

      bool isFirstSlide = direction == 1 || direction == 3
        ? position + offset <= 1.0
        : position - offset >= 0.0;

      if (isFirstSlide) {
        texel = texture2D(tDiffuse1, getVectorForDirection(direction, vUv, getOffsetPosition(direction, position, offset)));
      } else {
        texel = texture2D(tDiffuse2, getVectorForDirection(direction, vUv, getOffsetPosition(direction, position, offset)));
      }

      float velocity = (amount - prevAmount) * intensity;
      for (int i = 1; i < MAX_SAMPLES; ++i) {
        if (i >= samples) {
          // hack to allow loop comparisons against uniforms
          break;
        }
        float blurOffset = velocity * (float(i) / float(samples - 1) - 0.5);
        bool isFirstSlide = direction == 1 || direction == 3
          ? position + offset + blurOffset <= 1.0
          : position - offset - blurOffset >= 0.0;
        if (isFirstSlide) {
          texel += texture2D(tDiffuse1, getVectorForDirection(direction, vUv, getOffsetPosition(direction, position, offset + blurOffset)));
        } else {
          texel += texture2D(tDiffuse2, getVectorForDirection(direction, vUv, getOffsetPosition(direction, position, offset + blurOffset)));
        }
      }

      gl_FragColor = texel / max(1.0, float(samples));
    }

  `,
};

export {
  SlideTransitionShader,
  SlideDirection,
};

export default SlideTransitionShader;

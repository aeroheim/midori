import TWEEN from '@tweenjs/tween.js';
import { WebGLRenderTarget, Vector2 } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { BlendShader } from 'three/examples/jsm/shaders/BlendShader';
import { WipeShader } from './shaders/transition/wipe-shader';
import { SlideShader, SlideDirection } from './shaders/transition/slide-shader';
import { BlurShader } from './shaders/transition/blur-shader';
import { GlitchShader } from './shaders/transition/glitch-shader';
import { Background } from '../background';
import { TransitionEffect } from './effect';

const TransitionType = Object.freeze({
  NONE: 'none',
  BLEND: 'blend',
  WIPE: 'wipe',
  SLIDE: 'slide',
  BLUR: 'blur',
  GLITCH: 'glitch',
});

class TransitionPass extends Pass {
  _width;
  _height;

  _prevBackground; // the prev background to transition away from
  _buffer; // a buffer to render the prev background during transitions

  _transition = new TWEEN.Tween();
  _transitionEffect;

  constructor(background, width, height) {
    super();
    this._width = width;
    this._height = height;
    this._prevBackground = background || new Background(null, width, height);
    this._buffer = new WebGLRenderTarget(width, height);

    // this pass only needs to render when a transition occurs, so it should be disabled by default.
    this.enabled = false;
  }

  setSize(width, height) {
    this._width = width;
    this._height = height;
    this._prevBackground.setSize(width, height);
    this._buffer.setSize(width, height);
  }

  isTransitioning() {
    return this._transition.isPlaying();
  }

  /**
   * Renders a transition effect over the screen.
   * @param {TransitionType} type - the type of the transition.
   * @param {Background} nextBackground - the background to transition to.
   * @param {Object} config - configuration for the transition.
   * @param {Object} config.from={} - the starting transition values to start the transition from.
   * @param {Object} config.to={} - the ending transition values to finish the transition at.
   * @param {Number} config.duration=0 - the duration of the transition in seconds.
   * @param {Number} config.delay=0 - a delay in seconds before the transition starts.
   * @param {TWEEN.Easing} config.easing=TWEEN.Easing.Linear.None - the easing function to use for the transition.
   * @param {Function} config.onInit=()=>({}) - an optional callback when the transition is initialized.
   * @param {Function} config.onStart=()=>({}) - an optional callback when the transition starts.
   * @param {Function} config.onUpdate=()=>({}) - an optional callback when the transition updates.
   * @param {Function} config.onComplete=()=>({}) - an optional callback when the transition finishes.
   * @param {Function} config.onStop=()=>({}) - an optional callback when the transition stops or pauses.
   * @param {any} config... - any additional configuration specific to the transition type.
   */
  transition(type, nextBackground, config = {}) {
    const {
      from,
      to,
      duration,
      delay,
      easing,
      onInit,
      onStart,
      onUpdate,
      onComplete,
      onStop,
    } = this._getTransitionConfig(type, nextBackground, config);

    this._transition.stop();
    onInit();
    this._transition = new TWEEN.Tween(from)
      .to(to, duration)
      .easing(easing)
      .onStart(onStart)
      .onUpdate(onUpdate)
      .onComplete(onComplete)
      .onStop(onStop)
      .delay(delay)
      .start();
  }

  /**
   * Sets the internal transition effect to be used.
   * @param {Object} shader - an object defining a shader
   * @param {Object} uniforms - a map that defines the values of the uniforms to be used
   */
  _setTransitionEffect(shader, uniforms = {}) {
    if (this._transitionEffect) {
      this._transitionEffect.dispose();
      this._transitionEffect = null;
    }

    this._transitionEffect = new TransitionEffect(shader, uniforms);
  }

  /**
   * Returns a valid configuration for the specified transition type.
   * @param {TransitionType} type - the type of the transition.
   * @param {Background} nextBackground - the background to transition to.
   * @param {Object} config - see TransitionPass.transition.
   */
  _getTransitionConfig(type, nextBackground, config = {}) {
    const onTransitionStart = () => {
      // enable this pass when a transition starts.
      this.enabled = true;
    };
    const onTransitionEnd = () => {
      // disable this pass after a transition finishes.
      this.enabled = false;

      if (this._prevBackground) {
        this._prevBackground.dispose();
      }

      // cache the new background to be used for the next transition.
      this._prevBackground = nextBackground || new Background(null, this._width, this._height);
    };

    const {
      from = {},
      to = {},
      easing = TWEEN.Easing.Linear.None,
      duration = 0,
      delay = 0,
      onInit = () => ({}),
      onStart = () => ({}),
      onUpdate = () => ({}),
      onComplete = () => ({}),
      onStop = () => ({}),
      ...additionalConfig
    } = config;

    const baseTransitionConfig = {
      from,
      to,
      easing,
      duration: duration * 1000,
      delay: delay * 1000,
      onInit,
      onStart: () => {
        onTransitionStart();
        onStart();
      },
      onUpdate,
      onComplete: () => {
        onTransitionEnd();
        onComplete();
      },
      onStop: () => {
        onTransitionEnd();
        onStop();
      },
    };

    switch (type) {
      case TransitionType.NONE: {
        return {
          ...baseTransitionConfig,
          onStart: () => {
            this._setTransitionEffect(BlendShader, { mixRatio: 1 });
            onStart();
          },
        };
      }
      case TransitionType.BLEND: {
        const { from: { amount: blendFrom = 0 }, to: { amount: blendTo = 1 }, onStart, onUpdate } = baseTransitionConfig;
        return {
          ...baseTransitionConfig,
          from: { amount: blendFrom },
          to: { amount: blendTo },
          onStart: () => {
            this._setTransitionEffect(BlendShader);
            onStart();
          },
          onUpdate: ({ amount: mixRatio }) => {
            this._transitionEffect.updateUniforms({ mixRatio });
            onUpdate();
          },
        };
      }
      case TransitionType.WIPE: {
        const { from: { amount: wipeFrom = 0 }, to: { amount: wipeTo = 1 }, onStart, onUpdate } = baseTransitionConfig;
        const { gradient = 0, angle = 0 } = additionalConfig;
        return {
          ...baseTransitionConfig,
          from: { amount: wipeFrom },
          to: { amount: wipeTo },
          onStart: () => {
            this._setTransitionEffect(WipeShader, {
              gradient,
              angle,
              aspect: this._width / this._height,
            });
            onStart();
          },
          onUpdate: ({ amount }) => {
            // update the aspect ratio incase it changes in the middle of the transition
            this._transitionEffect.updateUniforms({ amount, aspect: this._width / this._height });
            onUpdate();
          },
        };
      }
      case TransitionType.SLIDE: {
        const { from: { amount: slideFrom = 0 }, to: { amount: slideTo = 1 }, onStart, onUpdate } = baseTransitionConfig;
        const { gradient = 0, slides = 1, intensity = 1, samples = 32, direction = SlideDirection.RIGHT } = additionalConfig;
        return {
          ...baseTransitionConfig,
          from: { amount: slideFrom },
          to: { amount: slideTo },
          onStart: () => {
            this._setTransitionEffect(SlideShader, {
              gradient,
              slides,
              intensity,
              samples,
              direction,
            });
            onStart();
          },
          onUpdate: ({ amount }) => {
            const { amount: prevAmount } = this._transitionEffect.getUniforms();
            this._transitionEffect.updateUniforms({ prevAmount, amount });
            onUpdate();
          },
        };
      }
      case TransitionType.BLUR: {
        const { from: { amount: blurFrom = 0 }, to: { amount: blurTo = 1 }, onStart, onUpdate } = baseTransitionConfig;
        const { intensity = 1, samples = 32 } = additionalConfig;
        return {
          ...baseTransitionConfig,
          from: { amount: blurFrom },
          to: { amount: blurTo },
          onStart: () => {
            this._setTransitionEffect(BlurShader, { intensity, samples });
            onStart();
          },
          onUpdate: ({ amount }) => {
            const { amount: prevAmount } = this._transitionEffect.getUniforms();
            this._transitionEffect.updateUniforms({ prevAmount, amount });
            onUpdate();
          },
        };
      }
      case TransitionType.GLITCH: {
        const { from: { amount: glitchFrom = 0 }, to: { amount: glitchTo = 1 }, onStart, onUpdate } = baseTransitionConfig;
        const { seed = 1 } = additionalConfig;
        return {
          ...baseTransitionConfig,
          from: { amount: glitchFrom },
          to: { amount: glitchTo },
          onStart: () => {
            this._setTransitionEffect(GlitchShader, { seed, resolution: new Vector2(this._width, this._height) });
            onStart();
          },
          onUpdate: ({ amount }) => {
            // update the resolution incase it changes in the middle of the transition
            const { resolution } = this._transitionEffect.getUniforms();
            resolution.set(this._width, this._height);
            this._transitionEffect.updateUniforms({ amount, });
            onUpdate();
          },
        };
      }
      default:
        return baseTransitionConfig;
    }
  }

  render(renderer, writeBuffer, readBuffer /* , deltaTime, maskActive */) {
    if (this.isTransitioning()) {
      this._prevBackground.render(renderer, this._buffer);
      this._transitionEffect.render(renderer, this.renderToScreen ? null : writeBuffer, this._buffer, readBuffer);
    }
  }
}

export {
  TransitionType,
  TransitionPass,
};

export default TransitionPass;

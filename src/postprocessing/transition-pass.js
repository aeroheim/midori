import { ShaderMaterial, UniformsUtils, WebGLRenderTarget } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import TWEEN from '@tweenjs/tween.js';
import { BlendShader } from './shaders/blend-shader';
import { WipeShader } from './shaders/wipe-shader';
import { SlideShader} from './shaders/slide-shader';
import { Background } from '../background';
import { BackgroundCamera } from '../background-camera';

const TransitionType = Object.freeze({
  BLEND: 'blend', // basic blend/fade
  WIPE: 'wipe', // directional wipe with configurable direction & angle
  SLIDE: 'slide', // fast sliding transition that fades w/ motion blur
  DISTORTION: 'distortion', // distortion zoom that fades w/ motion blur and optional spin
  GLITCH: 'glitch', // you already know :^)
});

class TransitionPass extends Pass {
  _width;
  _height;

  _background; // the cached background to transition away from
  _backgroundCamera;// the cached background camera to transition away from
  _buffer; // a buffer to render the cached background & camera during transitions

  _transition = new TWEEN.Tween();
  _transitionQuad = new Pass.FullScreenQuad();
  _transitionShader;

  constructor(background, backgroundCamera, width, height) {
    super();
    this._width = width;
    this._height = height;
    this._background = background || new Background();
    this._backgroundCamera = backgroundCamera || new BackgroundCamera(this._background, width, height);
    this._buffer = new WebGLRenderTarget(width, height);

    // this pass only needs to render when a transition occurs, so it should be disabled by default.
    this.enabled = false;
  }

  setSize(width, height) {
    this._width = width;
    this._height = height;
    this._background.setSize(width, height);
    this._backgroundCamera.setSize(width, height);
    this._buffer.setSize(width, height);
  }

  isPlaying() {
    return this._transition.isPlaying();
  }

  /**
   * Renders a transition effect over the screen.
   * @param {TransitionType} type - the type of the transition.
   * @param {Background} background - the background to transition to.
   * @param {BackgroundCamera} backgroundCamera - the background camera to transition to.
   * @param {Object} config - configuration for the transition.
   * @param {Object} config.from={} - the starting transition values to start the transition from.
   * @param {Object} config.to={} - the ending transition values to finish the transition at.
   * @param {Number} config.duration=0 - the duration of the transition in seconds.
   * @param {TWEEN.Easing} config.easing=TWEEN.Easing.Linear.None - the easing function to use for the transition.
   * @param {Function} config.onStart=()=>({}) - an optional callback when the transition starts.
   * @param {Function} config.onUpdate=()=>({}) - an optional callback when the transition updates.
   * @param {Function} config.onComplete=()=>({}) - an optional callback when the transition finishes.
   * @param {Function} config.onStop=()=>({}) - an optional callback when the transition stops or pauses.
   * @param {any} config... - any additional configuration specific to the transition type.
   */
  transition(type, background, backgroundCamera, config = {}) {
    const {
      from,
      to,
      duration,
      easing,
      onStart,
      onUpdate,
      onComplete,
      onStop,
    } = this._getTransitionConfig(type, background, backgroundCamera, config);

    this._transition.stop();
    this._transition = new TWEEN.Tween(from)
      .to(to, duration)
      .easing(easing)
      .onStart(onStart)
      .onUpdate(onUpdate)
      .onComplete(onComplete)
      .onStop(onStop)
      .start();
  }

  /**
   * Returns a valid configuration for the specified transition type.
   * @param {TransitionType} type - the type of the transition.
   * @param {Background} background - the background to transition to.
   * @param {BackgroundCamera} backgroundCamera - the background camera to transition to.
   * @param {Object} config - see TransitionPass.transition.
   */
  _getTransitionConfig(type, background, backgroundCamera, config = {}) {
    const onTransitionStart = () => {
      // enable this pass when a transition starts.
      this.enabled = true;
    };
    const onTransitionEnd = () => {
      // disable this pass after a transition finishes.
      this.enabled = false;

      // cache the new background/camera to be used for the next transition.
      this._background = background || new Background();
      this._backgroundCamera = backgroundCamera || new BackgroundCamera(this._background, this._width, this._height);

      // cleanup
      this._transitionShader.dispose();
      this._transitionQuad.material = null;
    };

    const {
      from = {},
      to = {},
      easing = TWEEN.Easing.Linear.None,
      duration = 0,
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
      case TransitionType.BLEND: {
        const { from: { amount: blendFrom = 0 }, to: { amount: blendTo = 1 }, onStart, onUpdate } = baseTransitionConfig;
        return {
          ...baseTransitionConfig,
          from: { amount: blendFrom },
          to: { amount: blendTo },
          onStart: () => {
            this._transitionShader = TransitionPass._createShaderMaterial(BlendShader);
            this._transitionQuad.material = this._transitionShader;
            onStart();
          },
          onUpdate: ({ amount }) => {
            this._transitionShader.uniforms.amount.value = amount;
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
            this._transitionShader = TransitionPass._createShaderMaterial(WipeShader, {
              gradient,
              angle,
              aspect: this._width / this._height,
            });
            this._transitionQuad.material = this._transitionShader;
            onStart();
          },
          onUpdate: ({ amount }) => {
            // update the aspect ratio incase it changes in the middle of the transition
            this._transitionShader.uniforms.aspect.value = this._width / this._height;
            this._transitionShader.uniforms.amount.value = amount;
            onUpdate();
          },
        };
      }
      case TransitionType.SLIDE: {
        const { from: { amount: slideFrom = 0, blendFrom = 0 }, to: { amount: slideTo = 1, blendTo = 1 }, onStart, onUpdate } = baseTransitionConfig;
        const { intensity = 1 } = additionalConfig;
        return {
          ...baseTransitionConfig,
          from: { amount: slideFrom, blend: blendFrom },
          to: { amount: slideTo, blend: blendTo },
          onStart: () => {
            this._transitionShader = TransitionPass._createShaderMaterial(SlideShader, { intensity });
            this._transitionQuad.material = this._transitionShader;
            onStart();
          },
          onUpdate: ({ amount, blend }) => {
            this._transitionShader.uniforms.amount.value = amount;
            this._transitionShader.uniforms.blend.value = blend;
            onUpdate();
          },
        };
      }
      case TransitionType.DISTORTION:
      case TransitionType.GLITCH:
      default:
        return baseTransitionConfig;
    }
  }

  /**
   * Returns a new ShaderMaterial given a shader definition and uniforms.
   * @param {Object} shader - an object defining a shader.
   * @param {Object} shader.uniforms - a map that defines the uniforms of the given shader
   * @param {string} shader.vertexShader - a string that defines the vertex shader program
   * @param {string} shader.fragmentShader - a string that defines the fragment shader program
   * @param {Object} uniforms - a map that defines the values of the uniforms to be used
   */
  static _createShaderMaterial(shader, uniforms = {}) {
    const material = new ShaderMaterial({
      uniforms: UniformsUtils.clone(shader.uniforms),
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
    });

    for (const uniform in uniforms) {
      material.uniforms[uniform].value = uniforms[uniform];
    }

    return material;
  }

  render(renderer, writeBuffer, readBuffer /* , deltaTime, maskActive */) {
    if (this._transition.isPlaying()) {
      // make sure we continue to update the old camera while transitioning to a new one
      this._backgroundCamera.update();

      // render the scene we're transitioning from
      renderer.setRenderTarget(this._buffer);
      renderer.render(this._background.scene, this._backgroundCamera.camera);

      this._transitionShader.uniforms.tDiffuse1.value = this._buffer.texture;
      this._transitionShader.uniforms.tDiffuse2.value = readBuffer.texture;

      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      this._transitionQuad.render(renderer);
    }
  }
}

export {
  TransitionType,
  TransitionPass,
};

export default TransitionPass;

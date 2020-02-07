import TWEEN from '@tweenjs/tween.js';
import { WebGLRenderTarget, Vector2, Shader, WebGLRenderer } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { BlendShader } from 'three/examples/jsm/shaders/BlendShader';
import { WipeShader } from './shaders/transition/wipe-shader';
import { SlideShader, SlideDirection } from './shaders/transition/slide-shader';
import { BlurShader } from './shaders/transition/blur-shader';
import { GlitchShader } from './shaders/transition/glitch-shader';
import { Background } from '../background';
import { TransitionEffect } from './effect';
import { TransitionConfig, BlendTransitionConfig, BlurTransitionConfig, WipeTransitionConfig, SlideTransitionConfig, GlitchTransitionConfig } from '../transition';
import { Uniforms } from './shaders/shader-utils';

export enum Transition {
  None,
  Blend,
  Blur,
  Wipe,
  Slide,
  Glitch,
}

class TransitionPass extends Pass {
  private _width: number;
  private _height: number;

  private _prevBackground: Background; // the prev background to transition away from
  private _buffer: WebGLRenderTarget; // a buffer to render the prev background during transitions

  private _transition: TWEEN.Tween = new TWEEN.Tween();
  private _transitionEffect: TransitionEffect;

  /**
   * Constructs a TransitionPass.
   * @param {Background | null} background
   * @param {number} width
   * @param {number} height
   */
  constructor(background: Background | null, width: number, height: number) {
    super();
    this._width = width;
    this._height = height;
    this._prevBackground = background || new Background(null, width, height);
    this._buffer = new WebGLRenderTarget(width, height);

    // this pass only needs to render when a transition occurs, so it should be disabled by default.
    this.enabled = false;
  }

  /**
   * Sets the size of the TransitionPass.
   * @param {number} width
   * @param {number} height
   */
  setSize(width: number, height: number) {
    this._width = width;
    this._height = height;
    this._prevBackground.setSize(width, height);
    this._buffer.setSize(width, height);
  }

  /**
   * Returns whether a transition is currently occurring.
   * @returns boolean
   */
  isTransitioning(): boolean {
    return this._transition.isPlaying();
  }

  /**
   * Renders a transition effect over the screen.
   * @param {Transition} transition - the transition to use.
   * @param {Background} background - the background to transition to.
   * @param {TransitionConfig} config - configuration for the transition.
   */
  transition(transition: Transition.Blend, background: Background, config: BlendTransitionConfig);
  transition(transition: Transition.Blur, background: Background, config: BlurTransitionConfig);
  transition(transition: Transition.Wipe, background: Background, config: WipeTransitionConfig);
  transition(transition: Transition.Slide, background: Background, config: SlideTransitionConfig);
  transition(transition: Transition.Glitch, background: Background, config: GlitchTransitionConfig);
  transition(transition: Transition, background: Background, config: TransitionConfig = {}) {
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
    } = this._getTransitionConfig(transition as any, background, config);

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
   * @param {Shader} shader - a shader definition.
   * @param {Uniforms} uniforms - a map that defines the values of the uniforms to be used.
   */
  private _setTransitionEffect(shader: Shader, uniforms: Uniforms = {}) {
    if (this._transitionEffect) {
      this._transitionEffect.dispose();
      this._transitionEffect = null;
    }
    this._transitionEffect = new TransitionEffect(shader, uniforms);
  }

  /**
   * Returns a valid configuration for the specified transition type.
   * @param {Transition} transition - the type of the transition.
   * @param {Background} background - the background to transition to.
   * @param {TransitionConfig} config - configuration for the transition.
   */
  private _getTransitionConfig(transition: Transition.Blend, background: Background, config: BlendTransitionConfig)
  private _getTransitionConfig(transition: Transition.Blur, background: Background, config: BlurTransitionConfig)
  private _getTransitionConfig(transition: Transition.Wipe, background: Background, config: WipeTransitionConfig)
  private _getTransitionConfig(transition: Transition.Slide, background: Background, config: SlideTransitionConfig)
  private _getTransitionConfig(transition: Transition.Glitch, background: Background, config: GlitchTransitionConfig)
  private _getTransitionConfig(transition: Transition, background: Background, config: TransitionConfig = {}): any {
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
      this._prevBackground = background || new Background(null, this._width, this._height);
    };

    const {
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
      from: { amount: 0 },
      to: { amount: 1 },
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

    switch (transition) {
      case Transition.None: {
        return {
          ...baseTransitionConfig,
          onStart: () => {
            this._setTransitionEffect(BlendShader, { mixRatio: 1 });
            onStart();
          },
        };
      }
      case Transition.Blend: {
        const { onStart, onUpdate } = baseTransitionConfig;
        return {
          ...baseTransitionConfig,
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
      case Transition.Wipe: {
        const { onStart, onUpdate } = baseTransitionConfig;
        const { gradient = 0, angle = 0 } = additionalConfig as WipeTransitionConfig;
        return {
          ...baseTransitionConfig,
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
      case Transition.Slide: {
        const { onStart, onUpdate } = baseTransitionConfig;
        const { gradient = 0, slides = 1, intensity = 1, samples = 32, direction = SlideDirection.Right } = additionalConfig as SlideTransitionConfig;
        return {
          ...baseTransitionConfig,
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
      case Transition.Blur: {
        const { onStart, onUpdate } = baseTransitionConfig;
        const { intensity = 1, samples = 32 } = additionalConfig as BlurTransitionConfig;
        return {
          ...baseTransitionConfig,
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
      case Transition.Glitch: {
        const { onStart, onUpdate } = baseTransitionConfig;
        const { seed = Math.random() } = additionalConfig as GlitchTransitionConfig;
        return {
          ...baseTransitionConfig,
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

  /**
   * Renders the transition.
   * @param {WebGLRenderer} renderer - the renderer to use.
   * @param {WebGLRenderTarget} writeBuffer - the buffer to render to, or null to render directly to screen.
   * @param {WebGLRenderTarget} readBuffer - the buffer to read from which contains the current background.
   */
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget) {
    if (this.isTransitioning()) {
      this._prevBackground.render(renderer, this._buffer);
      this._transitionEffect.render(renderer, this.renderToScreen ? null : writeBuffer, this._buffer, readBuffer);
    }
  }
}

export {
  TransitionPass,
};

export default TransitionPass;

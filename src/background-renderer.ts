import { WebGLRenderer, Texture, TextureLoader, ClampToEdgeWrapping, LinearFilter, Clock } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { WEBGL } from 'three/examples/jsm/WebGL';
import { update } from '@tweenjs/tween.js';
import { Background } from './background';
import { BackgroundPass } from './pipeline/background-pass';
import { EffectPass } from './pipeline/effect-pass';
import { TransitionPass, TransitionType, BlendTransitionConfig, WipeTransitionConfig, SlideTransitionConfig, BlurTransitionConfig, GlitchTransitionConfig } from './pipeline/transition-pass';
import { BackgroundTransitionConfig } from './transition';

type Transition = BlendTransition | WipeTransition | SlideTransition | BlurTransition | GlitchTransition;

interface BlendTransition extends BackgroundTransitionConfig {
  type: TransitionType.Blend;
  config: BlendTransitionConfig;
}

interface WipeTransition extends BackgroundTransitionConfig {
  type: TransitionType.Wipe;
  config: WipeTransitionConfig;
}

interface SlideTransition extends BackgroundTransitionConfig {
  type: TransitionType.Slide;
  config: SlideTransitionConfig;
}

interface BlurTransition extends BackgroundTransitionConfig {
  type: TransitionType.Blur;
  config: BlurTransitionConfig;
}

interface GlitchTransition extends BackgroundTransitionConfig {
  type: TransitionType.Glitch;
  config: GlitchTransitionConfig;
}

/**
 * Returns whether WebGL support is available.
 * @returns boolean
 */
function isWebGLSupported(): boolean {
  return WEBGL.isWebGLAvailable();
}

/**
 * Loads an image as a texture.
 * @param {string} path - path to the image file.
 * @return Promise<Texture> - texture on success, error on failure.
 */
function loadImage(path: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    new TextureLoader().load(path, (texture) => {
      // image should never wrap
      texture.wrapS = ClampToEdgeWrapping;
      texture.wrapT = ClampToEdgeWrapping;

      // image should be able to be UV mapped directly
      texture.minFilter = LinearFilter;

      // image should never repeat
      texture.repeat.set(1, 1);

      resolve(texture);
    },
    () => ({}),
    errorEvent => reject(errorEvent.error ?? new Error('Failed to load requested image. Verify CORS policy or check if the image is valid.')));
  });
}

interface BackgroundRendererOptions {
  // whether to automatically begin rendering - defaults to true.
  autoRender?: boolean;
}

class BackgroundRenderer {
  private _renderer: WebGLRenderer;
  private _composer: EffectComposer;
  private _background: Background;
  private _backgroundPass: BackgroundPass;
  private _transitionPass: TransitionPass;
  private _effectPass: EffectPass;
  private _clock: Clock = new Clock(false);
  private _renderAnimationFrame?: number;
  private _paused = true;
  private _disposed = false;

  /**
   * Constructs a renderer.
   * @param {HTMLCanvasElement} canvas - the canvas element to use.
   * @param {BackgroundRendererOptions} options - options for the renderer.
   */
  constructor(canvas: HTMLCanvasElement, options: BackgroundRendererOptions = {}) {
    const { clientWidth: width, clientHeight: height } = canvas;

    // renderer
    this._renderer = new WebGLRenderer({ canvas, powerPreference: 'high-performance' });
    this._renderer.setSize(width, height, false);

    // pipeline
    this._composer = new EffectComposer(this._renderer);
    this._background = new Background(null, width, height);
    this._backgroundPass = new BackgroundPass(this._background);
    this._transitionPass = new TransitionPass(this._background, width, height);
    this._effectPass = new EffectPass(width, height);
    this._composer.addPass(this._backgroundPass);
    this._composer.addPass(this._transitionPass);
    this._composer.addPass(this._effectPass);

    this._render = this._render.bind(this);

    const { autoRender = true } = options;
    if (autoRender) {
      this.render();
    }
  }

  /**
   * Returns the global effects.
   * Effects set on this will apply to all backgrounds.
   * @returns EffectPass
   */
  get effects(): EffectPass {
    return this._effectPass;
  }

  /**
   * Returns the current background.
   * @returns Background
   */
  get background(): Background {
    return this._background;
  }

  /**
   * Returns whether the background is currently transitioning.
   * @returns boolean
   */
  isTransitioning(): boolean {
    return this._transitionPass.isTransitioning();
  }

  /**
   * Sets the current background.
   * @param {Texture} texture - the image to use for the background.
   * @param {Transition} transition - optional configuration for a transition.
   */
  setBackground(texture: Texture, transition?: Transition): void {
    const { clientWidth: width, clientHeight: height } = this._renderer.domElement;
    this._background = new Background(texture, width, height);

    if (transition) {
      const { type, config: { onStart = () => ({}), ...transitionConfig } } = transition;
      this._transitionPass.transition(this._background, type, {
        ...transitionConfig,
        onStart: (prevBackground, nextBackground) => {
          this._backgroundPass.setBackground(nextBackground);
          onStart(prevBackground, nextBackground);
        },
      });
    } else {
      this._backgroundPass.setBackground(this._background);
      this._transitionPass.transition(this._background, TransitionType.None);
    }
  }

  /**
   * Resizes the canvas if necessary. Should be called on every render frame.
   */
  private _resizeCanvas() {
    const { width, height, clientWidth, clientHeight } = this._renderer.domElement;
    if (width !== clientWidth || height !== clientHeight) {
      this._renderer.setSize(clientWidth, clientHeight, false);
      this._composer.setSize(clientWidth, clientHeight);
      this._backgroundPass.setSize(clientWidth, clientHeight);
      this._transitionPass.setSize(clientWidth, clientHeight);
      this._effectPass.setSize(clientWidth, clientHeight);
    }
  }

  /**
   * Begins rendering the background.
   */
  render(): void {
    // cancel any previous ongoing renders
    if (this._renderAnimationFrame !== undefined) {
      cancelAnimationFrame(this._renderAnimationFrame);
      this._renderAnimationFrame = undefined;
    }

    this._paused = false;
    this._clock.start();
    this._render();
  }

  /**
   * Pauses rendering of the background.
   */
  pause(): void {
    this._paused = true;
    this._clock.stop();
    if (this._renderAnimationFrame !== undefined) {
      cancelAnimationFrame(this._renderAnimationFrame);
      this._renderAnimationFrame = undefined;
    }
  }

  /**
   * Returns whether the renderer is paused.
   * @returns {boolean}
   */
  get isPaused(): boolean {
    return this._paused;
  }

  /**
   * Renders the background, transitions, and effects. Should be called on every frame.
   */
  private _render() {
    update();
    this._resizeCanvas();

    if (!this._disposed) {
      this._composer.render(this._clock.getDelta());
      // eslint-disable-next-line @typescript-eslint/unbound-method
      this._renderAnimationFrame = requestAnimationFrame(this._render);
    }
  }

  /**
   * Disposes this object. Call when this object is no longer needed, otherwise leaks may occur.
   */
  dispose(): void {
    this._disposed = true;
    this._renderer.dispose();
    this._backgroundPass.dispose();
    this._transitionPass.dispose();
    this._effectPass.dispose();
    this._clock.stop();
  }
}

export {
  isWebGLSupported,
  loadImage,
  Transition,
  BlendTransition,
  WipeTransition,
  SlideTransition,
  BlurTransition,
  GlitchTransition,
  BackgroundRenderer,
};

export default BackgroundRenderer;

import { WebGLRenderer, Texture, TextureLoader, ClampToEdgeWrapping, LinearFilter } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import TWEEN from '@tweenjs/tween.js';
import { Background } from './background';
import { BackgroundPass } from './pipeline/background-pass';
import { EffectPass } from './pipeline/effect-pass';
import { TransitionPass, TransitionType, BlendTransitionConfig, WipeTransitionConfig, SlideTransitionConfig, BlurTransitionConfig, GlitchTransitionConfig } from './pipeline/transition-pass';
import { BackgroundTransitionConfig } from './transition';

export type Transition = BlendTransition | WipeTransition | SlideTransition | BlurTransition | GlitchTransition;

export interface BlendTransition extends BackgroundTransitionConfig {
  type: TransitionType.Blend;
  config: BlendTransitionConfig;
}

export interface WipeTransition extends BackgroundTransitionConfig {
  type: TransitionType.Wipe;
  config: WipeTransitionConfig;
}

export interface SlideTransition extends BackgroundTransitionConfig {
  type: TransitionType.Slide;
  config: SlideTransitionConfig;
}

export interface BlurTransition extends BackgroundTransitionConfig {
  type: TransitionType.Blur;
  config: BlurTransitionConfig;
}

export interface GlitchTransition extends BackgroundTransitionConfig {
  type: TransitionType.Glitch;
  config: GlitchTransitionConfig;
}

/**
 * Loads an image as a texture.
 * @async
 * @param {string} path - path to the image file.
 * @return Promise<Texture> - texture on success, error on failure.
 */
async function loadImage(path: string): Promise<Texture> {
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
    errorEvent => reject(errorEvent.error));
  });
}

class Renderer {
  private _renderer: WebGLRenderer;
  private _composer: EffectComposer;
  private _backgroundPass: BackgroundPass;
  private _transitionPass: TransitionPass;
  private _effectPass: EffectPass;
  private _disposed = false;

  /**
   * Constructs a renderer.
   * @param {HTMLCanvasElement} canvas - the canvas element to use.
   */
  constructor(canvas: HTMLCanvasElement) {
    const { clientWidth: width, clientHeight: height } = canvas;

    // renderer
    this._renderer = new WebGLRenderer({ canvas });
    this._renderer.setSize(width, height, false);

    // pipeline
    this._composer = new EffectComposer(this._renderer);
    this._backgroundPass = new BackgroundPass(new Background(null, width, height));
    this._transitionPass = new TransitionPass(this._backgroundPass.background, width, height);
    this._effectPass = new EffectPass(width, height);
    this._composer.addPass(this._backgroundPass);
    this._composer.addPass(this._transitionPass);
    this._composer.addPass(this._effectPass);

    this._render = this._render.bind(this);
    this._render();
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
    return this._backgroundPass.background;
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
   * Returns the background is currently transitioning.
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
  setBackground(texture: Texture, transition?: Transition) {
    const { clientWidth: width, clientHeight: height } = this._renderer.domElement;
    const nextBackground = new Background(texture, width, height);

    if (transition) {
      this._transitionPass.transition(nextBackground, transition.type as any, {
        ...transition.config,
        onStart: () => {
          this._backgroundPass.setBackground(nextBackground);
          transition.config?.onStart();
        },
      });
    } else {
      this._backgroundPass.setBackground(nextBackground);
      this._transitionPass.transition(nextBackground, TransitionType.None);
    }
  }

  /**
   * Renders the background, transitions, and effects. Should be called on every frame.
   */
  private _render(timestamp?: DOMHighResTimeStamp) {
    TWEEN.update(timestamp);
    this._resizeCanvas();
    this._composer.render();

    if (!this._disposed) {
      requestAnimationFrame(this._render);
    }
  }

  /**
   * Disposes this object. Call when this object is no longer needed, otherwise leaks may occur.
   */
  dispose() {
    this._disposed = true;
    this._renderer.dispose();
    this._backgroundPass.dispose();
    this._transitionPass.dispose();
    this._effectPass.dispose();
  }
}

export {
  loadImage,
  Renderer,
};

export default Renderer;

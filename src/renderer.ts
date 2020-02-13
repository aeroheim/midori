import { WebGLRenderer, MathUtils, Vector2, Texture, TextureLoader, ClampToEdgeWrapping, LinearFilter } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import TWEEN from '@tweenjs/tween.js';
import { Background } from './background';
import { BackgroundPass } from './pipeline/background-pass';
import { EffectPass } from './pipeline/effect-pass';
import { EffectType } from './effects/effect';
import { TransitionPass, TransitionType, BlendTransitionConfig, WipeTransitionConfig, SlideTransitionConfig, BlurTransitionConfig, GlitchTransitionConfig } from './pipeline/transition-pass';
import { SlideDirection } from './effects/shaders/transition/slide-shader';
import { WipeDirection } from './effects/shaders/transition/wipe-shader';
import { BackgroundTransitionConfig } from './transition';

export interface Transition {
  type: TransitionType;
  config: BackgroundTransitionConfig;
}

export interface BlendTransition extends Transition {
  type: TransitionType.Blend;
  config: BlendTransitionConfig;
}

export interface WipeTransition extends Transition {
  type: TransitionType.Wipe;
  config: WipeTransitionConfig;
}

export interface SlideTransition extends Transition {
  type: TransitionType.Slide;
  config: SlideTransitionConfig;
}

export interface BlurTransition extends Transition {
  type: TransitionType.Blur;
  config: BlurTransitionConfig;
}

export interface GlitchTransition extends Transition {
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

/* 
  async getTexture(imagePath)

  // automatically handle onresize events for canvas element
  constructor(canvasElement)
  isTransitioning()
  render() - maybe? or could it be automatic?
  // should have same way to copy settings from prev background (e.g particles, effects)
  setBackground(texture, transition) - make sure to expose old background as well for advanced transitions
  get particles()
  get effects()
  get camera()
  dispose()
*/

// TODO: properly dispose of three.js objects
class Renderer {
  private _renderer: WebGLRenderer;
  private _composer: EffectComposer;
  private _backgroundPass: BackgroundPass;
  private _transitionPass: TransitionPass;
  private _effectPass: EffectPass;

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

  // TODO: add to types TransitionType.None
  // TODO: all callbacks should expose prev/next background
  // config object - flags for copying effects, particles, camera
  setBackground(texture: Texture, transition?: Transition) {
    const transitions = [
      {
        type: TransitionType.Wipe,
        config: {
          gradient: 0.5,
          angle: MathUtils.degToRad(15),
          duration: 1.5,
          easing: TWEEN.Easing.Quintic.InOut,
          direction: WipeDirection[Object.keys(WipeDirection)[Math.floor(Math.random() * Object.keys(WipeDirection).length)]],
        },
      },
      {
        type: TransitionType.Blur,
        config: {
          duration: 1,
          intensity: 1.5,
          easing: TWEEN.Easing.Quintic.InOut,
        },
      },
      {
        type: TransitionType.Slide,
        config: {
          slides: 2,
          intensity: 5,
          duration: 1.5,
          easing: TWEEN.Easing.Quintic.InOut,
          direction: SlideDirection[Object.keys(SlideDirection)[Math.floor(Math.random() * Object.keys(SlideDirection).length)]],
        },
      },
      {
        type: TransitionType.Glitch,
        config: {
          seed: Math.random(),
          from: { amount: 0.0 },
          to: { amount: 1.0 },
          duration: 1.5,
          easing: TWEEN.Easing.Cubic.InOut,
        }
      }
    ];

    const { clientWidth: width, clientHeight: height } = this._renderer.domElement;

    const prevBackground = this._backgroundPass.background;
    const nextBackground = new Background(texture, width, height);
    this._effectPass.set(EffectType.Bloom, { radius: 2, passes: 1 });
    // nextBackground.effects.set(EffectType.Blur, { radius: 1, passes: 6 });
    this._effectPass.set(EffectType.VignetteBlur, { size: 3, radius: 1.5, passes: 2 });
    // nextBackground.effects.set(EffectType.RgbShift, { amount: 0.005, angle: 135 });
    this._effectPass.set(EffectType.Vignette, { darkness: 1, offset: 1 });
    // nextBackground.effects.set(EffectType.Glitch, { amount: 0.8, seed: Math.random() });

    nextBackground.effects.set(EffectType.MotionBlur, { intensity: 1, samples: 32 });

    nextBackground.particles.generate([
      {
        name: 'small',
        amount: 200,
        maxSize: 5,
        maxOpacity: 0.8,
        minGradient: 0.75,
        maxGradient: 1.0,
      },
      {
        name: 'medium',
        amount: 50,
        maxSize: 12,
        maxOpacity: 0.8,
        minGradient: 0.75,
        maxGradient: 1.0,
      },
      {
        name: 'large',
        amount: 30,
        minSize: 100,
        maxSize: 125,
        maxOpacity: 0.05,
        minGradient: 1.0,
        maxGradient: 1.0,
      },

    ]);
    nextBackground.particles.move('small', { distance: 0.5, angle: 25 }, { duration: 5, loop: true });
    nextBackground.particles.sway('small', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: TWEEN.Easing.Sinusoidal.InOut, loop: true });
    nextBackground.particles.move('medium', { distance: 0.3, angle: 45 }, { duration: 5, loop: true });
    nextBackground.particles.sway('medium', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: TWEEN.Easing.Sinusoidal.InOut, loop: true });
    nextBackground.particles.move('large', { distance: 0.4, angle: 35 }, { duration: 5, loop: true });
    nextBackground.particles.sway('large', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: TWEEN.Easing.Sinusoidal.InOut, loop: true });

    const { type, config } = transitions[Math.floor(Math.random() * transitions.length)];
    this._transitionPass.transition(nextBackground, type as any, {
      ...config,
      delay: 1.25,
      onInit: () => {
        prevBackground.camera.move({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7 }, {
          duration: 2.5,
          easing: TWEEN.Easing.Quartic.In,
        });
        prevBackground.camera.rotate(-5 + Math.random() * 10, {
          duration: 2.5,
          easing: TWEEN.Easing.Quartic.In,
        });
      },
      onStart: () => {
        this._backgroundPass.setBackground(nextBackground);

        nextBackground.camera.move({ x: Math.random(), y: Math.random(), z: 0.7 + Math.random() * 0.3 }, {
          duration: 2,
          easing: TWEEN.Easing.Quartic.Out,
        });
        nextBackground.camera.sway({ x: 0.1, y: 0.05, z: 0.02, zr: 1 }, {
          duration: 1.5,
          easing: TWEEN.Easing.Quadratic.InOut,
          loop: true,
        });
        nextBackground.camera.rotate(-5 + Math.random() * 10, {
          duration: 2,
          easing: TWEEN.Easing.Quartic.Out,
        });
      },
    });
  }

  render() {
    this._resizeCanvas();
    this._composer.render();
  }
}

export {
  loadImage,
  Renderer,
};

export default Renderer;

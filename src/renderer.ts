import { WebGLRenderer, Vector4, Vector3, Math as MathUtils, Vector2, Texture, TextureLoader, ClampToEdgeWrapping, LinearFilter } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import TWEEN from '@tweenjs/tween.js';
import { Background } from './background';
import { BackgroundPass } from './background-pass';
import { EffectPass } from './postprocessing/effect-pass';
import { EffectType } from './postprocessing/effect';
import { TransitionPass, TransitionType } from './postprocessing/transition-pass';
import { SlideDirection } from './postprocessing/shaders/transition/slide-shader';

/**
 * Loads an image as a texture.
 * @async
 * @param {string} path - path to the image file.
 * @return {Promise} - texture on success, error on failure.
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

// TODO: properly dispose of three.js objects
class Renderer {
  _domElement;
  _width;
  _height;

  _renderer;
  _composer;
  _backgroundPass;
  _effectPass;
  _transitionPass;

  constructor(domElement) {
    this._domElement = domElement;
    this._width = domElement.clientWidth;
    this._height = domElement.clientHeight;

    // initialize renderer
    this._renderer = new WebGLRenderer();
    this._renderer.domElement.id = 'midori';
    this._renderer.setSize(this._width, this._height);
    this._domElement.appendChild(this._renderer.domElement);
    this.onResize = this.onResize.bind(this);
    window.onresize = this.onResize;

    // rendering pipeline
    this._backgroundPass = new BackgroundPass(new Background(null, this._width, this._height));
    this._transitionPass = new TransitionPass(this._backgroundPass.background, this._width, this._height);
    this._effectPass = new EffectPass(this._width, this._height);

    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(this._backgroundPass);
    this._composer.addPass(this._transitionPass);
    this._composer.addPass(this._effectPass);
  }

  // TODO: define a setSize instead?
  onResize() {
    this._width = this._domElement.clientWidth;
    this._height = this._domElement.clientHeight;
    this._composer.setSize(this._width, this._height);
    this._renderer.setSize(this._width, this._height);
    this._backgroundPass.setSize(this._width, this._height);
    this._transitionPass.setSize(this._width, this._height);
    this._effectPass.setSize(this._width, this._height);
  }

  // TODO: for testing purposes
  test() {
    const { camera } = this._backgroundPass.background;
    camera.move({ x: Math.random(), y: Math.random(), z: 0.5 + Math.random() * 0.5 }, {
      duration: 2,
      easing: TWEEN.Easing.Cubic.InOut,
    });
    camera.rotate(MathUtils.degToRad(-5 + Math.random() * 10), {
      duration: 2,
      easing: TWEEN.Easing.Cubic.InOut,
    });
  }

  isTransitioning() {
    return this._transitionPass.isTransitioning();
  }

  setBackground(texture) {
    const transitions = [
      {
        type: TransitionType.WIPE,
        config: {
          gradient: 0.5,
          angle: MathUtils.degToRad(15),
          duration: 1.5,
          easing: TWEEN.Easing.Quintic.InOut,
        },
      },
      {
        type: TransitionType.BLUR,
        config: {
          duration: 1,
          intensity: 1.5,
          easing: TWEEN.Easing.Quintic.InOut,
        },
      },
      {
        type: TransitionType.SLIDE,
        config: {
          direction: SlideDirection[Object.keys(SlideDirection)[Math.floor(Math.random() * Object.keys(SlideDirection).length)]],
          slides: 2,
          intensity: 5,
          duration: 1.5,
          easing: TWEEN.Easing.Quintic.InOut,
        },
      },
      {
        type: TransitionType.GLITCH,
        config: {
          seed: Math.random(),
          from: { amount: 0.0 },
          to: { amount: 1.0 },
          duration: 1.5,
          easing: TWEEN.Easing.Cubic.InOut,
        }
      }
    ];

    const prevBackground = this._backgroundPass.background;
    const nextBackground = new Background(texture, this._width, this._height);
    // nextBackground.effects.effect(EffectType.BLOOM, { radius: 1, passes: 2 });
    // nextBackground.effects.effect(EffectType.BLUR, { radius: 1, passes: 6 });
    // nextBackground.effects.effect(EffectType.VIGNETTE_BLUR, { size: 3, radius: 1.5, passes: 2 });
    // nextBackground.effects.effect(EffectType.RGB_SHIFT, { amount: 0.005, angle: threeMath.degToRad(135) });
    // nextBackground.effects.effect(EffectType.MOTION_BLUR, { intensity: 1, samples: 32 });
    nextBackground.effects.effect(EffectType.VIGNETTE, { darkness: 1, offset: 1 });
    // nextBackground.effects.effect(EffectType.GLITCH, { amount: 0.8, seed: Math.random() });
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
    nextBackground.particles.move('small', new Vector2(0.5, MathUtils.degToRad(25)), { duration: 5, loop: true });
    nextBackground.particles.sway('small', new Vector2(0.025, 0.025), { duration: 1.5, easing: TWEEN.Easing.Sinusoidal.InOut, loop: true });
    nextBackground.particles.move('medium', new Vector2(0.3, MathUtils.degToRad(45)), { duration: 5, loop: true });
    nextBackground.particles.sway('medium', new Vector2(0.025, 0.025), { duration: 1.5, easing: TWEEN.Easing.Sinusoidal.InOut, loop: true });
    nextBackground.particles.move('large', new Vector2(0.4, MathUtils.degToRad(35)), { duration: 5, loop: true });
    nextBackground.particles.sway('large', new Vector2(0.025, 0.025), { duration: 1.5, easing: TWEEN.Easing.Sinusoidal.InOut, loop: true });

    const { type, config } = transitions[Math.floor(Math.random() * transitions.length)];
    this._transitionPass.transition(type, nextBackground, {
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
        nextBackground.camera.sway({ y: 0.1, z: 0.02, zr: 1 }, {
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
    this._composer.render();
  }
}

export {
  loadImage,
  Renderer,
};

export default Renderer;

import { WebGLRenderer, Vector4, Vector3, Math as threeMath } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import TWEEN from '@tweenjs/tween.js';
import { Background } from './background';
import BackgroundPass from './postprocessing/background-pass';
import { EffectPass } from './postprocessing/effect-pass';
import { EffectType } from './postprocessing/effect';
import { TransitionPass, TransitionType } from './postprocessing/transition-pass';
import { SlideDirection } from './postprocessing/shaders/transition/slide-shader';

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
    camera.move(new Vector4(Math.random(), Math.random(), (Math.random() * 0.5) + 0.5), {
      duration: 2,
      easing: TWEEN.Easing.Cubic.InOut,
    });
    camera.rotate(threeMath.degToRad(-5 + Math.random() * 10), {
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
          angle: threeMath.degToRad(15),
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
    ];

    const prevBackground = this._backgroundPass.background;
    const nextBackground = new Background(texture, this._width, this._height);
    nextBackground.effects.effect(EffectType.BLOOM, { radius: 1, passes: 3 });
    // nextBackground.effects.effect(EffectType.BLUR, { radius: 0.2, passes: 6 });
    // nextBackground.effects.effect(EffectType.RGB_SHIFT, { amount: 0.005, angle: threeMath.degToRad(135) });
    nextBackground.effects.effect(EffectType.MOTION_BLUR, { intensity: 1, samples: 32 });
    nextBackground.effects.effect(EffectType.VIGNETTE);
    nextBackground.particles.particles([
      {
        name: 'layer1',
        size: 20,
        amount: 100,
        opacity: 0.3,
      },
      {
        name: 'layer2',
        size: 10,
        amount: 100,
        opacity: 0.8,
      },
      {
        name: 'layer3',
        size: 5,
        amount: 100,
        opacity: 1.0,
      },
    ]);

    const { type, config } = transitions[Math.floor(Math.random() * transitions.length)];
    this._transitionPass.transition(type, nextBackground, {
      ...config,
      delay: 1.25,
      onInit: () => {
        prevBackground.camera.move(new Vector4(Math.random(), Math.random(), (Math.random() * 0.7) + 0.3), {
          duration: 2.25,
          easing: TWEEN.Easing.Quartic.In,
        });
        prevBackground.camera.rotate(threeMath.degToRad(-5 + Math.random() * 10), {
          duration: 2.25,
          easing: TWEEN.Easing.Quartic.In,
        });
      },
      onStart: () => {
        this._backgroundPass.setBackground(nextBackground);
        nextBackground.camera.move(new Vector3(0, 0, 1), {
          duration: 2,
          easing: TWEEN.Easing.Quartic.Out,
        });
        nextBackground.camera.sway(new Vector4(0.1, 0.1, 0.02, threeMath.degToRad(1)), {
          duration: 1.5,
          easing: TWEEN.Easing.Quadratic.InOut,
          loop: true,
        });
        nextBackground.camera.rotate(threeMath.degToRad(-5 + Math.random() * 10), {
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
  Renderer,
};

export default Renderer;

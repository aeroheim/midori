import { WebGLRenderer, Vector4, Vector3, Math as threeMath } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import TWEEN from '@tweenjs/tween.js';
import { Background } from './background';
import BackgroundPass from './postprocessing/background-pass';
import { EffectPass, EffectType } from './postprocessing/effect-pass';
import { TransitionPass, TransitionType } from './postprocessing/transition-pass';
import { SlideDirection } from './postprocessing/shaders/slide-shader';

// TODO: properly dispose of three.js objects
class Renderer {
  _domElement;
  _width;
  _height;

  _background;
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

    // main scene and camera
    this._background = new Background(null, this._width, this._height);

    // rendering pipeline
    this._backgroundPass = new BackgroundPass(this._background);
    // this._effectPass = new EffectPass();
    this._transitionPass = new TransitionPass(this._background, this._width, this._height);

    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(this._backgroundPass);
    // this._composer.addPass(this._effectPass);
    this._composer.addPass(this._transitionPass);
  }

  // TODO: define a setSize instead?
  onResize() {
    this._width = this._domElement.clientWidth;
    this._height = this._domElement.clientHeight;
    this._background.setSize(this._width, this._height);
    this._composer.setSize(this._width, this._height);
    this._renderer.setSize(this._width, this._height);
    this._transitionPass.setSize(this._width, this._height);
  }

  // TODO: for testing purposes
  test() {
    this._background.camera.move(new Vector4(Math.random(), Math.random(), (Math.random() * 0.5) + 0.5), {
      duration: 2,
      easing: TWEEN.Easing.Cubic.InOut,
    });
    this._background.camera.rotate(threeMath.degToRad(-5 + Math.random() * 10), {
      duration: 2,
      easing: TWEEN.Easing.Cubic.InOut,
    });
  }

  isTransitioning() {
    return this._transitionPass.isTransitioning();
  }

  setBackground(texture) {
    this._background = new Background(texture, this._width, this._height);
    this._background.effects.effect(EffectType.MOTION_BLUR, { intensity: 2 });
    this._background.camera.move(new Vector3(Math.random(), Math.random(), (Math.random() * 0.5) + 0.5), {
      duration: 1,
      easing: TWEEN.Easing.Cubic.Out,
    });
    this._background.camera.sway(new Vector4(0.1, 0.1, 0.02, threeMath.degToRad(1)), {
      duration: 2,
      easing: TWEEN.Easing.Quadratic.InOut,
    });
    this._background.camera.rotate(threeMath.degToRad(-5 + Math.random() * 10), {
      duration: 1,
      easing: TWEEN.Easing.Quartic.Out,
    });

    // kick off transition in post-processing
    const transitions = [
      /*
      {
        type: TransitionType.BLEND,
        config: {
          duration: 1,
          easing: TWEEN.Easing.Cubic.Out,
        },
      },
      {
        type: TransitionType.WIPE,
        config: {
          gradient: 0.5,
          angle: threeMath.degToRad(15),
          duration: 1,
          easing: TWEEN.Easing.Cubic.Out,
        },
      },
      */
      {
        type: TransitionType.SLIDE,
        config: {
          direction: SlideDirection.RIGHT,
          slides: 3,
          intensity: 10,
          duration: 1.5,
          easing: TWEEN.Easing.Quintic.InOut,
        },
      },
      /*
      {
        type: TransitionType.ZOOM,
        config: {
          from: { z: 1.0 },
          to: { z: 0.8 },
          duration: 1.5,
          easing: TWEEN.Easing.Quartic.InOut,
        },
      },
      {
        type: TransitionType.ZOOM,
        config: {
          from: { z: 0.6 },
          to: { z: 0.8 },
          duration: 1.5,
          easing: TWEEN.Easing.Quartic.InOut,
        },
      },
      */
    ];
    const { type, config } = transitions[Math.floor(Math.random() * transitions.length)];
    this._transitionPass.transition(type, this._background, {
      ...config,
      onStart: () => this._backgroundPass.setBackground(this._background),
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

import { WebGLRenderer, Vector4, Math as threeMath } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import TWEEN from '@tweenjs/tween.js';
import { BackgroundCamera } from './background-camera';
import { Background } from './background';
import BackgroundPass from './postprocessing/background-pass';
import { EffectPass, EffectType } from './postprocessing/effect-pass';
import { TransitionPass, TransitionType } from './postprocessing/transition-pass';

// TODO: properly dispose of three.js objects
class Renderer {
  _domElement;
  _width;
  _height;

  _background;
  _backgroundCamera;

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
    this._background = new Background();
    this._backgroundCamera = new BackgroundCamera(this._background, this._width, this._height);

    // post-processing pipeline
    this._composer = new EffectComposer(this._renderer);
    this._backgroundPass = new BackgroundPass(this._background.scene, this._backgroundCamera.camera);
    this._effectPass = new EffectPass();
    this._transitionPass = new TransitionPass(this._background, this._backgroundCamera, this._width, this._height);
    this._composer.addPass(this._backgroundPass);
    this._composer.addPass(this._effectPass);
    this._composer.addPass(this._transitionPass);
  }

  // TODO: define a setSize instead?
  onResize() {
    this._width = this._domElement.clientWidth;
    this._height = this._domElement.clientHeight;
    this._composer.setSize(this._width, this._height);
    this._renderer.setSize(this._width, this._height);
    this._backgroundCamera.setSize(this._width, this._height);
    this._backgroundPass.setSize(this._width, this._height);
    this._transitionPass.setSize(this._width, this._height);
  }

  // TODO: temp mainly for debugging purposes
  test() {
    this._backgroundCamera.move(new Vector4(Math.random(), Math.random(), (Math.random() * 0.5) + 0.5), {
      duration: 2,
      easing: TWEEN.Easing.Quartic.Out,
    });
    this._backgroundCamera.rotate(threeMath.degToRad(-5 + Math.random() * 10), {
      duration: 2,
      easing: TWEEN.Easing.Quartic.Out,
    });
  }

  setBackground(background) {
    // set main background, re-initialize camera
    this._background = background;
    this._backgroundCamera = new BackgroundCamera(this._background, this._width, this._height);
    this._backgroundCamera.move(new Vector4(Math.random(), Math.random(), (Math.random() * 0.5) + 0.5), {
      duration: 1,
      easing: TWEEN.Easing.Quartic.Out,
    });
    this._backgroundCamera.sway(new Vector4(0.1, 0.1, 0.02, threeMath.degToRad(1)), {
      duration: 2,
      easing: TWEEN.Easing.Quadratic.InOut,
    });
    this._backgroundCamera.rotate(threeMath.degToRad(-5 + Math.random() * 10), {
      duration: 1,
      easing: TWEEN.Easing.Quartic.Out,
    });

    // kick off transition in post-processing
    this._transitionPass.transition(TransitionType.SLIDE, this._background, this._backgroundCamera, {
      slides: 5,
      duration: 1.2,
      easing: TWEEN.Easing.Cubic.Out,
      onStart: () => {
        this._backgroundPass.setBackground(this._background.scene, this._backgroundCamera.camera);
        this._effectPass.setPersistentEffect(EffectType.MOTION_BLUR, {
          intensity: 3.5,
          camera: this._backgroundCamera.camera,
          depthTexture: this._backgroundPass.depthTexture,
        });
      },
      // TODO: make sure to dispose of old camera/background in onComplete
    });
  }

  render() {
    this._backgroundCamera.update();
    this._composer.render();
  }
}

export {
  Renderer,
};

export default Renderer;

import { WebGLRenderer, Math as threeMath } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import TWEEN from '@tweenjs/tween.js';
import { CameraVector, BackgroundCamera } from './camera';
import { Background } from './background';
import { TransitionPass, TransitionType } from './postprocessing/transition-pass';

// TODO: properly dispose of three.js objects
class Renderer {
  _domElement;
  _width;
  _height;

  _background;
  _camera;

  _renderer;
  _composer;
  _renderPass;
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
    this.onKeyUp = this.onKeyUp.bind(this); // TODO: temp for debugging purposes
    window.onresize = this.onResize;
    window.onkeyup = this.onKeyUp;

    // main scene and camera
    this._background = new Background();
    this._camera = new BackgroundCamera(this._background, this._width, this._height);

    // post-processing pipeline
    this._composer = new EffectComposer(this._renderer);
    this._renderPass = new RenderPass(this._background.scene, this._camera.camera);
    this._transitionPass = new TransitionPass(this._background, this._camera, this._width, this._height);
    this._composer.addPass(this._renderPass);
    this._composer.addPass(this._transitionPass);
  }

  // TODO: define a setSize instead?
  onResize() {
    this._width = this._domElement.clientWidth;
    this._height = this._domElement.clientHeight;
    this._renderer.setSize(this._width, this._height);
    this._camera.setSize(this._width, this._height);
    this._renderPass.setSize(this._width, this._height);
    this._transitionPass.setSize(this._width, this._height);
  }

  // TODO: temp mainly for debugging purposes
  onKeyUp() {
    this._camera.move(new CameraVector(Math.random(), Math.random(), (Math.random() * 0.5) + 0.5), {
      duration: 1,
      easing: TWEEN.Easing.Quartic.Out,
    });
    this._camera.rotate(threeMath.degToRad(-5 + Math.random() * 10), {
      duration: 1,
      easing: TWEEN.Easing.Quartic.Out,
    });
  }

  // TODO: generalize transitions
  setBackground(background) {
    // set main background, re-initialize camera
    this._background = background;
    this._camera = new BackgroundCamera(this._background, this._width, this._height);
    this._camera.move(new CameraVector(Math.random(), Math.random(), (Math.random() * 0.5) + 0.5), {
      duration: 1,
      easing: TWEEN.Easing.Quartic.Out,
    });
    this._camera.sway(new CameraVector(0.1, 0.1, 0.02, threeMath.degToRad(1)), {
      duration: 2,
      easing: TWEEN.Easing.Quadratic.InOut,
    });
    this._camera.rotate(threeMath.degToRad(-5 + Math.random() * 10), {
      duration: 1,
      easing: TWEEN.Easing.Quartic.Out,
    });

    // kick off transition in post-processing
    this._renderPass.scene = this._background.scene;
    this._renderPass.camera = this._camera.camera;
    this._transitionPass.transition(TransitionType.BLEND, this._background, this._camera, {
      duration: 1,
      easing: TWEEN.Easing.Cubic.Out,
    });
  }

  render() {
    this._camera.update();
    this._composer.render();
  }
}

export {
  Renderer,
};

export default Renderer;

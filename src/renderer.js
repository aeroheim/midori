import * as three from 'three';
import TWEEN from '@tweenjs/tween.js';
import Camera from './camera';
import Background from './background';

class Renderer {
  _domElement;
  _width;
  _height;

  _renderer;

  _canvasBackground;
  _canvasCamera;

  _primaryBackground; // need a default background scene when nothing is loaded
  _primaryCamera;
  _primaryBuffer;

  _transitionBackground;
  _transitionCamera;
  _transitionBuffer;

  _transition;

  constructor(domElement) {
    this._domElement = domElement;
    this._width = domElement.clientWidth;
    this._height = domElement.clientHeight;

    this._renderer = new three.WebGLRenderer();
    this._renderer.domElement.id = 'midori';
    this._domElement.appendChild(this._renderer.domElement);

    // TODO figure out buffers
    this._primaryBuffer = new three.WebGLRenderTarget(this._width, this._height);
    this._transitionBuffer = new three.WebGLRenderTarget(this._width, this._height);

    this._canvasBackground = new Background();
    this._canvasBackground.setSize(this._width, this._height);
    this._canvasCamera = new Camera(this._width, this._height);
    this._primaryBackground = new Background();
    this._primaryCamera = new Camera(this._width, this._height);
    this._transitionBackground = new Background();
    this._transitionCamera = new Camera(this._width, this._height);

    this._renderer.setSize(this._width, this._height);
    this.onResize = this.onResize.bind(this);
    window.onresize = this.onResize;
  }

  onResize() {
    this._width = this._domElement.clientWidth;
    this._height = this._domElement.clientHeight;
    this._canvasBackground.setSize(this._width, this._height);

    // TODO figure out buffers
    this._canvasCamera.setSize(this._width, this._height);
    this._primaryBuffer.setSize(this._width, this._height);
    this._transitionBuffer.setSize(this._width, this._height);

    this._renderer.setSize(this._width, this._height);
    this._primaryCamera.setSize(this._width, this._height);
    this._transitionCamera.setSize(this._width, this._height);
  }

  // TODO
  // need to add support for background transitions
  setBackground(background) {
    if (!this._transition) {
      this._transition = new TWEEN.Tween({ opacity: 1 })
        .to({ opacity: 0 }, 1000)
        .easing(TWEEN.Easing.Cubic.Out)
        .onStart(() => {
          console.log('new transition');

          // TODO: set canvas material to shader material so we can apply crossfade shader
          // this._canvasBackground.setMaterial();

          // old background/camera becomes transition background/camera
          this._transitionBackground = background;
          this._transitionCamera = this._primaryCamera;

          // new background becomes primary background, re-initialize camera
          this._primaryBackground = background;
          this._primaryCamera = new Camera(this._width, this._height); // TODO: consider cloning camera to preserve current movement?

        })
        .onComplete(() => {
          console.log('finish transition');

          // TODO: set canvas material back to regular material
          // this._canvasBackground.setMaterial();
          this._transition = null;
        })
        .start();

      /*
      this._primaryBackground = background;
      const object = this._primaryBackground.getThreeObject();
      if (object) {
        this._primaryCamera.move(object, 0, 0, 1);
      }
      */

      return true;
    }

    return false;
  }

  /*
  animate(effect, options) {

  }
  */

  renderToTarget(target, background, camera) {
    this._renderer.setRenderTarget(target); // set render target
    this._renderer.render(background.getThreeScene(), camera.getThreeCamera());
    this._renderer.setRenderTarget(null); // reset render target
  }

  // TODO: eventually there should be an fx scene as well?
  // we should use an EffectComposer, apply post-processing mainly to the canvas (and render targets if necessary)
  render() {
    // TODO figure out buffers
    if (this._transition) {
      this.renderToTarget(this._transitionBuffer, this._transitionBackground, this._transitionCamera);
    }

    this.renderToTarget(this._primaryBuffer, this._primaryBackground, this._primaryCamera);

    // TODO: canvas background should use a custom ShaderMaterial that diffuses between _primaryBuffer and _transitionBuffer
    // the two textures can be injected into the shader as uniforms.
    this._canvasCamera.move(this._canvasBackground.getThreeObject(), 0, 0, 1);

    this._renderer.render(this._canvasBackground.getThreeScene(), this._canvasCamera.getThreeCamera());
    // this._renderer.render(this._primaryBackground.getThreeScene(), this._primaryCamera.getThreeCamera());
  }
}

export default Renderer;

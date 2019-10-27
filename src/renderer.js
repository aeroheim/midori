import * as three from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import TWEEN from '@tweenjs/tween.js';
import { CrossFadeShader } from './shaders/cross-fade';
import BackgroundCamera from './camera';
import Background from './background';

class Renderer {
  _domElement;
  _width;
  _height;

  _renderer;
  _composer;
  _renderPass;
  _fadePass;

  _background;
  _camera;

  _transitionBackground;
  _transitionCamera;
  _transitionBuffer;

  _transition;

  constructor(domElement) {
    this._domElement = domElement;
    this._width = domElement.clientWidth;
    this._height = domElement.clientHeight;

    // initialize renderer
    this._renderer = new three.WebGLRenderer();
    this._renderer.domElement.id = 'midori';
    this._renderer.setSize(this._width, this._height);
    this._domElement.appendChild(this._renderer.domElement);
    this.onResize = this.onResize.bind(this);
    window.onresize = this.onResize;

    // main scene and camera
    this._background = new Background();
    this._camera = new BackgroundCamera(this._background, this._width, this._height);

    // spare scene, camera, and buffer for use in transitions
    this._transitionBuffer = new three.WebGLRenderTarget(this._width, this._height);
    this._transitionBackground = new Background();
    this._transitionCamera = new BackgroundCamera(this._transitionBackground, this._width, this._height);

    // post-processing pipeline
    this._composer = new EffectComposer(this._renderer);
    this._renderPass = new RenderPass(this._background.scene, this._camera.camera);
    this._fadePass = new ShaderPass(CrossFadeShader);
    this._composer.addPass(this._renderPass);
    this._composer.addPass(this._fadePass);
  }

  // TODO
  startTransition(background) {
    console.log('start transition');

    // old background and camera are used in the transition
    this._transitionBackground = this._background;
    this._transitionCamera = this._camera;

    // set main background, re-initialize camera
    this._background = background;
    this._camera = new BackgroundCamera(this._background, this._width, this._height);
    this._camera.move(0, 0, 1); // TODO: preserve or lead from old camera movement

    // kick off transition in post-processing
    this._renderPass.scene = this._background.scene;
    this._renderPass.camera = this._camera.camera;
    this._fadePass.uniforms.transition.value = true;
    this._fadePass.uniforms.fadeTexture.value = this._transitionBuffer.texture;
  }

  // TODO
  endTransition() {
    console.log('end transition');
    this._fadePass.uniforms.transition.value = false;
    this._fadePass.uniforms.fadeTexture.value = false;
    this._transition = null;
  }

  onResize() {
    this._width = this._domElement.clientWidth;
    this._height = this._domElement.clientHeight;
    this._renderer.setSize(this._width, this._height);
    this._camera.setSize(this._width, this._height);
    this._transitionCamera.setSize(this._width, this._height);
    this._transitionBuffer.setSize(this._width, this._height);
  }

  // TODO: generalize transitions
  setBackground(background) {
    if (!this._transition) {
      this._transition = new TWEEN.Tween({ opacity: 1 })
        .to({ opacity: 0 }, 1000)
        .easing(TWEEN.Easing.Cubic.Out)
        .onStart(() => this.startTransition(background))
        .onUpdate((obj) => { this._fadePass.uniforms.opacity.value = obj.opacity; })
        .onComplete(() => this.endTransition())
        .start();

      return true;
    }

    return false;
  }

  renderToTarget(target, background, camera) {
    this._renderer.setRenderTarget(target);
    this._renderer.render(background.scene, camera.camera);
    this._renderer.setRenderTarget(null);
  }

  render() {
    if (this._transition) {
      this.renderToTarget(this._transitionBuffer, this._transitionBackground, this._transitionCamera);
    }

    this._composer.render();
    // this._renderer.render(this._primaryBackground.scene, this._primaryCamera.camera);
  }
}

export default Renderer;

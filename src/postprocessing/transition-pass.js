import { ShaderMaterial, UniformsUtils, WebGLRenderTarget, MeshBasicMaterial } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import TWEEN from '@tweenjs/tween.js';
import { BlendShader } from './shaders/blend';
import { Background } from '../background';
import { BackgroundCamera } from '../camera';

const TransitionType = Object.freeze({
  BLEND: 'blend', // basic blend/fade with configurable direction & angle
  SLIDE: 'slide', // fast sliding transition that fades w/ motion blur
  DISTORTION: 'distortion', // distortion zoom that fades w/ motion blur and optional spin
  GLITCH: 'glitch', // you already know :^)
});

class TransitionPass extends Pass {
  _width;
  _height;

  _background; // the cached background to transition from
  _camera;// the cached camera to transition from
  _buffer; // a buffer to render the cached background & camera during transitions

  _transition = new TWEEN.Tween();
  _transitionQuad;

  constructor(background, camera, width, height) {
    super();
    this._width = width;
    this._height = height;
    this._background = background || new Background();
    this._camera = camera || new BackgroundCamera(this._background, width, height);
    this._buffer = new WebGLRenderTarget(width, height);

    // NOTE: this pass only needs to render when a transition occurs, so disable it by default.
    this.enabled = false;
  }

  setSize(width, height) {
    this._background.setSize(width, height);
    this._camera.setSize(width, height);
    this._buffer.setSize(width, height);
  }

  isPlaying() {
    return this._transition.isPlaying();
  }

  // TODO: this probably needs to manipulate the camera to achieve some effects
  // null background/camera should be acceptable, will transition to black
  transition(type, background, camera, config = {}, onComplete = () => {}) {
    const transitionOnComplete = () => {
      onComplete();
      this._background = background || new Background();
      this._camera = camera || new BackgroundCamera(this._background, this._width, this._height);
      this._transitionQuad = null;

      // transition has finished - disable this pass.
      this.enabled = false;
    };

    // TODO: handle transitions being interrupted with new ones
    switch (type) {
      case TransitionType.BLEND:
        this._blendTransition(config, transitionOnComplete);
        break;
      case TransitionType.SLIDE:
      case TransitionType.DISTORTION:
      case TransitionType.GLITCH:
      default:
        // TODO: implement transitions
        break;
    }
  }

  _blendTransition(config = {}, onComplete = () => {}) {
    this._transition.stop();

    this._transition = new TWEEN.Tween({
      opacity: 0,
      // TODO: add other transition props
    })
      .to({
        opacity: config.opacity || 0,
      }, (config.duration || 0) * 1000)
      .easing(config.easing || TWEEN.Easing.Linear.None)
      .onStart(() => {
        // transition has started - enable this pass.
        this.enabled = true;

        this._transitionQuad = new Pass.FullScreenQuad(
          new ShaderMaterial({
            uniforms: UniformsUtils.clone(BlendShader.uniforms),
            vertexShader: BlendShader.vertexShader,
            fragmentShader: BlendShader.fragmentShader,
          }),
        );
      })
      .onUpdate(({ opacity }) => {
        const { material: shader } = this._transitionQuad;
        shader.uniforms.opacity.value = opacity;
      })
      .onComplete(() => {
        // TODO: update uniforms here
        onComplete();
      })
      .start();
  }

  render(renderer, writeBuffer, readBuffer /* , deltaTime, maskActive */) {
    if (this._transition.isPlaying()) {
      this._camera.update();
    }

    // TODO: fix weird flashing issue at beginning of transition
    if (this._transitionQuad) {
      const { material: shader } = this._transitionQuad;

      // render the scene we're transitioning from
      renderer.setRenderTarget(this._buffer);
      renderer.render(this._background.scene, this._camera.camera);

      shader.uniforms.tDiffuse1.value = readBuffer.texture;
      shader.uniforms.tDiffuse2.value = this._buffer.texture;

      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      this._transitionQuad.render(renderer);
    }
  }
}

export {
  TransitionType,
  TransitionPass,
};

export default TransitionPass;

import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import TWEEN from '@tweenjs/tween.js';

const TransitionType = Object.freeze({
  BLEND: 'blend', // basic blend/fade with configurable direction & angle
  SLIDE: 'slide', // fast sliding transition that fades w/ motion blur
  DISTORTION: 'distortion', // distortion zoom that fades w/ motion blur and optional spin
  GLITCH: 'glitch', // you already know :^)
});

// TODO: this class should abstract away multiple shaders needed for transitions
// it should also provide a clean API to do transitions that takes care of the low level details
// (e.g enabling/disabling shaders, setting up tweens, etc.)
class TransitionPass extends Pass {
  _transition = new TWEEN.Tween();
  _background;
  _camera;
  _buffer;

  constructor(background, camera) {
    super();
    this._background = background;
    this._camera = camera;
  }

  // TODO: this probably needs to manipulate the camera to achieve some effects
  // null background/camera should be acceptable, will transition to black
  transition(type, background, camera, config = {}, onComplete = () => {}) {
    const transitionOnComplete = () => {
      onComplete();
      this._background = background;
      this._camera = camera;
    };

    switch (type) {
      case TransitionType.BLEND:
        this.blendTransition(config, transitionOnComplete);
        break;
      default:
        break;
    }
  }

  blendTransition(config = {}, onComplete = () => {}) {
    this._transition.stop();

    this._transition = new TWEEN.Tween({
      opacity: 1,
      // TODO: add other transition props
    })
      .to({
        opacity: config.opacity || 0,
      })
      .easing(config.easing || TWEEN.Easing.Linear.None)
      .onStart(() => {})
      .onUpdate(() => {})
      .onComplete(() => onComplete())
      .start();
  }

  /*
  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {

  }
  */
}

export {
  TransitionType,
  TransitionPass,
};

export default TransitionPass;

import { Pass } from 'three/examples/jsm/postprocessing/Pass';

// TODO: this class should abstract away multiple shaders needed for transitions
// it should also provide a clean API to do transitions that takes care of the low level details
// (e.g enabling/disabling shaders, setting up tweens, etc.)
class TransitionPass extends Pass {

  /*
  _transitionBackground;
  _transitionCamera;
  _transitionBuffer;

  transition() {

  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {

  }
  */
}

export default TransitionPass;

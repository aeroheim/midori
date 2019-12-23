import { Pass } from 'three/examples/jsm/postprocessing/Pass';

class BackgroundPass extends Pass {
  _background;

  constructor(background) {
    super();
    this._background = background;
  }

  setBackground(background) {
    this._background = background;
  }

  render(renderer, writeBuffer /* readBuffer, deltaTime, maskActive */) {
    this._background.render(renderer, this.renderToScreen ? null : writeBuffer);
  }
}

export default BackgroundPass;

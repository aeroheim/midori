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

  get background() {
    return this._background;
  }

  setSize(width, height) {
    this._background.setSize(width, height);
  }

  render(renderer, writeBuffer /* readBuffer, deltaTime, maskActive */) {
    this._background.render(renderer, this.renderToScreen ? null : writeBuffer);
  }
}

export default BackgroundPass;

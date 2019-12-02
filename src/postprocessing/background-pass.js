import { WebGLRenderTarget, DepthTexture } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';

class BackgroundPass extends Pass {
  _scene;
  _camera;
  _buffer;

  constructor(scene, camera, width, height) {
    super();
    this._scene = scene;
    this._camera = camera;
    this._buffer = new WebGLRenderTarget(width, height);
    this._buffer.depthTexture = new DepthTexture(width, height);
  }

  get depthBuffer() {
    return this._buffer.depthTexture;
  }

  setSize(width, height) {
    this._buffer.setSize(width, height);
    this._buffer.depthTexture.image.width = width;
    this._buffer.depthTexture.image.height = height;
  }

  setBackground(scene, camera) {
    this._scene = scene;
    this._camera = camera;
  }

  render(renderer, writeBuffer /* readBuffer, deltaTime, maskActive */) {
    // render to internal buffer to update depth texture
    renderer.setRenderTarget(this._buffer);
    renderer.render(this._scene, this._camera);

    // render to writeBuffer/screen
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    renderer.render(this._scene, this._camera);
  }
}

export default BackgroundPass;

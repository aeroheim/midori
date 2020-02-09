import { WebGLRenderer, WebGLRenderTarget } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { Background } from '../background';

class BackgroundPass extends Pass {
  private _background: Background;

  /**
   * Constructs a BackgroundPass.
   * @param {Background} background
   */
  constructor(background: Background) {
    super();
    this._background = background;
  }

  /**
   * Sets the current background.
   * @param {Background} background
   */
  setBackground(background: Background) {
    this._background = background;
  }

  /**
   * Returns the current background.
   * @returns Background
   */
  get background(): Background {
    return this._background;
  }

  /**
   * Sets the size of the current background.
   * @param {number} width
   * @param {number} height
   */
  setSize(width: number, height: number) {
    this._background.setSize(width, height);
  }

  /**
   * Renders the current background.
   * @param {WebGLRenderer} renderer - the renderer to use.
   * @param {WebGLRenderTarget} writeBuffer - the buffer to render to, or null to render directly to screen.
   */
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget) {
    this._background.render(renderer, this.renderToScreen ? null : writeBuffer);
  }

  /**
   * Disposes this object. Call when this object is no longer needed, otherwise leaks may occur.
   */
  dispose() {
    this._background.dispose();
  }
}

export {
  BackgroundPass,
};

export default BackgroundPass;

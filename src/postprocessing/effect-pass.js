import { WebGLRenderTarget } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader';
import { EffectType, MotionBlurEffect, GaussianBlurEffect, Effect } from './effect';

class EffectPass extends Pass {
  _width;
  _height;

  _readBuffer;
  _writeBuffer;
  _copyShader = new Effect(CopyShader);

  _effects = {};

  constructor(width, height) {
    super();
    this._width = width;
    this._height = height;
    this._readBuffer = new WebGLRenderTarget(width, height);
    this._writeBuffer = new WebGLRenderTarget(width, height);

    // this pass only needs to render when there is at least one effect, so it should be disabled by default.
    this.enabled = false;
  }

  setSize(width, height) {
    this._width = width;
    this._height = height;
    this._readBuffer.setSize(width, height);
    this._writeBuffer.setSize(width, height);

    if (this._effects[EffectType.BLUR]) {
      this._effects[EffectType.BLUR].setSize(width, height);
    }
  }

  get effects() {
    return { ...this._effects };
  }

  hasEffects() {
    return Object.getOwnPropertyNames(this._effects).length !== 0;
  }

  _getOrCreateEffect(type, config = {}) {
    if (!(type in this._effects)) {
      switch (type) {
        case EffectType.BLUR:
          this._effects[type] = new GaussianBlurEffect(this._width, this._height);
          break;
        case EffectType.MOTION_BLUR:
          this._effects[type] = new MotionBlurEffect(config.camera, config.depthBuffer);
          break;
        case EffectType.RGB_SHIFT:
        case EffectType.BLOOM:
        case EffectType.DOF:
        case EffectType.PARTICLE:
        default:
          break;
      }
    }

    return this._effects[type];
  }

  effect(type, config = {}) {
    const effect = this._getOrCreateEffect(type, config);
    if (effect) {
      // enable this pass when there is at least one effect.
      this.enabled = true;

      switch (type) {
        case EffectType.BLUR: {
          const { radius = 1, passes = effect.passes } = config;
          effect.passes = passes;
          effect.updateUniforms({ radius });
          break;
        }
        case EffectType.MOTION_BLUR: {
          const { camera = effect.camera, depthBuffer = effect.depthBuffer, intensity = 1, samples } = config;
          effect.camera = camera;
          effect.depthBuffer = depthBuffer;
          effect.updateUniforms({ intensity, samples });
          break;
        }
        case EffectType.RGB_SHIFT:
        case EffectType.BLOOM:
        case EffectType.DOF:
        case EffectType.PARTICLE:
        default:
          break;
      }
    }
  }

  removeEffect(type) {
    if (type in this._effects) {
      this._effects[type].dispose();
      delete this._effects[type];

      // disable this pass if there are no effects left.
      this.enabled = this.hasEffects();
      return true;
    }

    return false;
  }

  _swapBuffers() {
    const tmp = this._readBuffer;
    this._readBuffer = this._writeBuffer;
    this._writeBuffer = tmp;
  }

  render(renderer, writeBuffer, readBuffer /* deltaTime, maskActive */) {
    this._copyShader.render(renderer, this._readBuffer, { tDiffuse: readBuffer.texture });

    if (this._effects[EffectType.BLUR]) {
      this._effects[EffectType.BLUR].render(renderer, this._writeBuffer, { tDiffuse: this._readBuffer.texture });
      this._swapBuffers();
    }
    if (this._effects[EffectType.MOTION_BLUR]) {
      this._effects[EffectType.MOTION_BLUR].render(renderer, this._writeBuffer, { tDiffuse: this._readBuffer.texture });
      this._swapBuffers();
    }

    this._copyShader.render(renderer, this.renderToScreen ? null : writeBuffer, { tDiffuse: this._readBuffer.texture });
  }

  // TODO: call this as necessary
  dispose() {
    this._copyShader.dispose();
    this._readBuffer.dispose();
    this._readBuffer.texture.dispose();
    this._writeBuffer.dispose();
    this._writeBuffer.texture.dispose();
    Object.values(this._effects).forEach(effect => effect.dispose());
  }
}

export {
  EffectPass,
};

export default EffectPass;

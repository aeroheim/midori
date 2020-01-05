import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { EffectType, Effect, MotionBlurEffect } from './effect';

class EffectPass extends Pass {
  _effects = {};

  constructor() {
    super();

    // this pass only needs to render when there is at least one effect, so it should be disabled by default.
    this.enabled = false;
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
        case EffectType.MOTION_BLUR:
          this._effects[type] = new MotionBlurEffect(config.camera, config.depthBuffer);
          break;
        case EffectType.RGB_SHIFT:
        case EffectType.BLOOM:
        case EffectType.BLUR:
        case EffectType.DOF:
        case EffectType.PARTICLE:
        default:
          break;
      }
    }

    return this._effects[type];
  }

  // TODO: accepts a config + tween for a one-time effect animation
  // TODO: accept configurable variance/sway for certain effects
  effect(type, config = {}) {
    const effect = this._getOrCreateEffect(type, config);
    if (effect) {
      // enable this pass when there is at least one effect.
      this.enabled = true;
      switch (type) {
        case EffectType.MOTION_BLUR: {
          const { camera, depthBuffer, intensity = 3.5 } = config;
          effect.updateUniforms({ intensity }, camera, depthBuffer);
          break;
        }
        case EffectType.RGB_SHIFT:
        case EffectType.BLOOM:
        case EffectType.BLUR:
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

  render(renderer, writeBuffer, readBuffer /* deltaTime, maskActive */) {
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this._effects[EffectType.MOTION_BLUR]) {
      this._effects[EffectType.MOTION_BLUR].render(renderer, { tDiffuse: readBuffer.texture });
    }
  }
}

export {
  EffectPass,
};

export default EffectPass;

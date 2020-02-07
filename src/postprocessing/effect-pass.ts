import { WebGLRenderTarget } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader';
import { EffectType, Effect, MotionBlurEffect, GaussianBlurEffect, BloomEffect, VignetteBlurEffect, GlitchEffect, IEffect } from './effect';

type EffectMap = {[effect in EffectType]?: IEffect};

class EffectPass extends Pass {
  private _width: number;
  private _height: number;

  private _readBuffer: WebGLRenderTarget;
  private _writeBuffer: WebGLRenderTarget;
  private _copyShader: Effect = new Effect(CopyShader);

  private _effects: EffectMap = {};

  /**
   * Constructs an EffectPass.
   * @param {number} width
   * @param {number} height
   */
  constructor(width: number, height: number) {
    super();
    this._width = width;
    this._height = height;
    this._readBuffer = new WebGLRenderTarget(width, height);
    this._writeBuffer = new WebGLRenderTarget(width, height);

    // this pass only needs to render when there is at least one effect, so it should be disabled by default.
    this.enabled = false;
  }

  /**
   * Sets the size of the EffectPass.
   * @param {number} width
   * @param {number} height
   */
  setSize(width: number, height: number) {
    this._width = width;
    this._height = height;
    this._readBuffer.setSize(width, height);
    this._writeBuffer.setSize(width, height);

    for (const effect of Object.values(this._effects)) {
      if (effect.setSize) {
        effect.setSize(width, height);
      }
    }
  }

  /**
   * Returns the currently set effects.
   * @returns EffectMap
   */
  get effects(): EffectMap {
    return { ...this._effects };
  }

  /**
   * Returns whether any effects are currently set.
   * @returns boolean
   */
  hasEffects(): boolean {
    return Object.getOwnPropertyNames(this._effects).length !== 0;
  }

  private _getOrCreateEffect(type: EffectType, config = {}) {
    if (!(type in this._effects)) {
      switch (type) {
        case EffectType.Blur:
          this._effects[type] = new GaussianBlurEffect(this._width, this._height);
          break;
        case EffectType.Bloom:
          this._effects[type] = new BloomEffect(this._width, this._height);
          break;
        case EffectType.RgbShift:
          this._effects[type] = new Effect(RGBShiftShader);
          break;
        case EffectType.Vignette:
          this._effects[type] = new Effect(VignetteShader);
          break;
        case EffectType.VignetteBlur:
          this._effects[type] = new VignetteBlurEffect(this._width, this._height);
          break;
        case EffectType.MotionBlur:
          this._effects[type] = new MotionBlurEffect(config.camera, config.depthBuffer);
          break;
        case EffectType.Glitch:
          this._effects[type] = new GlitchEffect(this._width, this._height);
          break;
      }
    }

    return this._effects[type];
  }

  /**
   * Sets an effect.
   * @param {EffectType} type - the effect to set.
   * @param {Object} config - configuration specific to the effect specified.
   */
  set(type, config = {}) {
    const effect = this._getOrCreateEffect(type, config);
    if (effect) {
      // enable this pass when there is at least one effect.
      this.enabled = true;

      switch (type) {
        case EffectType.Bloom: {
          const { opacity = 1, radius = 1, passes = effect.passes } = config;
          effect.passes = passes;
          effect.updateUniforms({ opacity, radius });
          break;
        };
        case EffectType.Blur: {
          const { radius = 1, passes = effect.passes } = config;
          effect.passes = passes;
          effect.updateUniforms({ radius });
          break;
        }
        case EffectType.RgbShift: {
          const { amount = 0.005, angle = 0 } = config;
          effect.updateUniforms({ amount, angle });
          break;
        }
        case EffectType.Vignette: {
          const { offset = 1, darkness = 1 } = config;
          effect.updateUniforms({ offset, darkness });
          break;
        }
        case EffectType.VignetteBlur: {
          const { opacity = 1, size = 1, radius = 1, passes = effect.passes } = config;
          effect.passes = passes;
          effect.updateUniforms({ opacity, radius, size });
          break;
        }
        case EffectType.MotionBlur: {
          const { camera = effect.camera, depthBuffer = effect.depthBuffer, intensity = 1, samples = 32 } = config;
          effect.camera = camera;
          effect.depthBuffer = depthBuffer;
          effect.updateUniforms({ intensity, samples });
          break;
        }
        case EffectType.Glitch: {
          const { amount = 1, seed = Math.random() } = config;
          effect.updateUniforms({ amount, seed });
          break;
        }
      }
    }
  }

  /**
   * Removes a previously set effect. Returns true if the effect was removed, otherwise false.
   * @param {EffectType} type - the type of the effect.
   */
  remove(type) {
    if (type in this._effects) {
      this._effects[type].dispose();
      delete this._effects[type];

      // disable this pass if there are no effects left.
      this.enabled = this.hasEffects();
      return true;
    }

    return false;
  }

  removeAll() {
    for (const type in this._effects) {
      this._effects[type].dispose();
      delete this._effects[type];
    }
    this.enabled = false;
  }

  _swapBuffers() {
    const tmp = this._readBuffer;
    this._readBuffer = this._writeBuffer;
    this._writeBuffer = tmp;
  }

  render(renderer, writeBuffer, readBuffer /* deltaTime, maskActive */) {
    this._copyShader.render(renderer, this._readBuffer, readBuffer);
    for (const effect of Object.values(this._effects)) {
      effect.render(renderer, this._writeBuffer, this._readBuffer);
      this._swapBuffers();
    }
    this._copyShader.render(renderer, this.renderToScreen ? null : writeBuffer, this._readBuffer);
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

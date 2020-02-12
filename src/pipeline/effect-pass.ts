import { WebGLRenderTarget, WebGLRenderer, MathUtils } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader';
import { EffectType, Effect, GaussianBlurEffect, BloomEffect, VignetteBlurEffect,
  GlitchEffect, IEffect, RGBShiftEffect, VignetteEffect } from '../effects/effect';

export type EffectConfig = BlurEffectConfig | BloomEffectConfig | RgbShiftEffectConfig
| VignetteEffectConfig | VignetteBlurEffectConfig | GlitchEffectConfig;

export interface BlurEffectConfig {
  // the size of the blur.
  radius?: number;
  // the number of blur passes - more passes result in stronger blurs and less artifacts at the cost of performance.
  passes?: number;
}

export interface BloomEffectConfig {
  // the overall brightness of the bloom.
  opacity?: number;
  // the size of the bloom.
  radius?: number;
  // the number of bloom passes - more passes result in stronger blooms and less artifacts at the cost of performance.
  passes?: number;
}

export interface RgbShiftEffectConfig {
  // the distance of the shift.
  amount?: number;
  // the angle of the shift in degrees.
  angle?: number;
}

export interface VignetteEffectConfig {
  // the size of the vignette.
  offset?: number;
  // the intensity of the vignette.
  darkness?: number;
}

export interface VignetteBlurEffectConfig {
  // the size of the vignette.
  size?: number;
  // the size of the blur.
  radius?: number;
  // the number of blur passes - more passes result in stronger blurs and less artifacts at the cost of performance.
  passes?: number;
}

export interface GlitchEffectConfig {
  // the intensity of the glitch.
  amount?: number;
  // a random seed from 0 to 1 used to generate glitches.
  seed?: number;
}

export interface EffectConfigs {
  [EffectType.Blur]?: BlurEffectConfig;
  [EffectType.Bloom]?: BloomEffectConfig;
  [EffectType.RgbShift]?: RgbShiftEffectConfig;
  [EffectType.Vignette]?: VignetteEffectConfig;
  [EffectType.VignetteBlur]?: VignetteBlurEffectConfig;
  [EffectType.Glitch]?: GlitchEffectConfig;
}

type EffectMap = {[effect in EffectType]?: IEffect};

class EffectPass extends Pass {
  private _width: number;
  private _height: number;

  private _readBuffer: WebGLRenderTarget;
  private _writeBuffer: WebGLRenderTarget;
  private _copyShader: Effect = new Effect(CopyShader);

  protected _effects: EffectMap = {};

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
   * Returns the configurations for the currently set effects.
   * @returns EffectConfigs
   */
  getConfigs(): EffectConfigs {
    const configs: EffectConfigs = {};
    for (const [type, effect] of Object.entries(this._effects)) {
      switch (type) {
        case EffectType.Blur: {
          const { radius } = effect.getUniforms();
          configs[type] = { radius, passes: (effect as GaussianBlurEffect).passes };
          break;
        }
        case EffectType.Bloom: {
          const { opacity, radius } = effect.getUniforms();
          configs[type] = { opacity, radius, passes: (effect as BloomEffect).passes };
          break;
        }
        case EffectType.RgbShift: {
          const { amount, angle } = effect.getUniforms();
          configs[type] = { amount, angle };
          break;
        }
        case EffectType.Vignette: {
          const { offset, darkness } = effect.getUniforms();
          configs[type] = { offset, darkness };
          break;
        }
        case EffectType.VignetteBlur: {
          const { size, radius } = effect.getUniforms();
          configs[type] = { size, radius, passes: (effect as VignetteBlurEffect).passes };
          break;
        }
        case EffectType.Glitch: {
          const { amount, seed } = effect.getUniforms();
          configs[type] = { amount, seed };
          break;
        }
      }
    }
    return configs;
  }

  /**
   * Returns whether a specified effect is currently set.
   * @param {EffectType} type
   * @returns boolean
   */
  hasEffect(type: EffectType): boolean {
    return this._effects.hasOwnProperty(type);
  }

  /**
   * Returns whether any effects are currently set.
   * @returns boolean
   */
  hasEffects(): boolean {
    return Object.getOwnPropertyNames(this._effects).length !== 0;
  }

  /**
   * Returns the current effect for the specified type.
   * If no effect is currently set for the type, creates a new effect for the type and returns it.
   * @param {EffectType} type
   * @param {EffectConfig} config
   * @returns IEffect
   */
  protected _getEffect(type: EffectType): IEffect {
    if (!(type in this._effects)) {
      switch (type) {
        case EffectType.Blur:
          this._effects[type] = new GaussianBlurEffect(this._width, this._height);
          break;
        case EffectType.Bloom:
          this._effects[type] = new BloomEffect(this._width, this._height);
          break;
        case EffectType.RgbShift:
          this._effects[type] = new RGBShiftEffect();
          break;
        case EffectType.Vignette:
          this._effects[type] = new VignetteEffect();
          break;
        case EffectType.VignetteBlur:
          this._effects[type] = new VignetteBlurEffect(this._width, this._height);
          break;
        case EffectType.Glitch:
          this._effects[type] = new GlitchEffect(this._width, this._height);
          break;
      }
    }

    return this._effects[type];
  }

  /**
   * Sets an effect. If an effect is already set, updates the set effect.
   * @param {EffectType} type - the effect to set.
   * @param {Object} config - configuration specific to the effect specified.
   */
  set(type: EffectType.Blur, config: BlurEffectConfig)
  set(type: EffectType.Bloom, config: BloomEffectConfig)
  set(type: EffectType.RgbShift, config: RgbShiftEffectConfig)
  set(type: EffectType.Vignette, config: VignetteEffectConfig)
  set(type: EffectType.VignetteBlur, config: VignetteBlurEffectConfig)
  set(type: EffectType.Glitch, config: GlitchEffectConfig)
  set(type: EffectType, config: EffectConfig = {}) {
    const effect = this._getEffect(type);
    if (effect) {
      // enable this pass when there is at least one effect.
      this.enabled = true;

      switch (type) {
        case EffectType.Blur: {
          const { radius = 1, passes = (effect as GaussianBlurEffect).passes } = config as BlurEffectConfig;
          (effect as GaussianBlurEffect).passes = passes;
          effect.updateUniforms({ radius });
          break;
        }
        case EffectType.Bloom: {
          const { opacity = 1, radius = 1, passes = (effect as BloomEffect).passes } = config as BloomEffectConfig;
          (effect as BloomEffect).passes = passes;
          effect.updateUniforms({ opacity, radius });
          break;
        }
        case EffectType.RgbShift: {
          const { amount = 0.005, angle = 0 } = config as RgbShiftEffectConfig;
          effect.updateUniforms({ amount, angle: MathUtils.degToRad(angle) });
          break;
        }
        case EffectType.Vignette: {
          const { offset = 1, darkness = 1 } = config as VignetteEffectConfig;
          effect.updateUniforms({ offset, darkness });
          break;
        }
        case EffectType.VignetteBlur: {
          const { size = 1, radius = 1, passes = (effect as VignetteBlurEffect).passes } = config as VignetteBlurEffectConfig;
          (effect as VignetteBlurEffect).passes = passes;
          effect.updateUniforms({ radius, size });
          break;
        }
        case EffectType.Glitch: {
          const { amount = 1, seed = Math.random() } = config as GlitchEffectConfig;
          effect.updateUniforms({ amount, seed });
          break;
        }
      }
    }
  }

  /**
   * Removes a set effect. Returns true if the effect was removed, otherwise false.
   * @param {EffectType} type - the type of the effect.
   * @returns boolean
   */
  remove(type: EffectType): boolean {
    if (type in this._effects) {
      this._effects[type].dispose();
      delete this._effects[type];

      // disable this pass if there are no effects left.
      this.enabled = this.hasEffects();
      return true;
    }

    return false;
  }

  /**
   * Removes all set effects.
   */
  removeAll() {
    for (const type in this._effects) {
      this._effects[type].dispose();
      delete this._effects[type];
    }
    this.enabled = false;
  }

  /**
   * Swaps the internal read and write buffers. Should be called each time after rendering an effect.
   */
  private _swapBuffers() {
    const tmp = this._readBuffer;
    this._readBuffer = this._writeBuffer;
    this._writeBuffer = tmp;
  }

  /**
   * Renders the effects.
   * @param {WebGLRenderer} renderer - the renderer to use.
   * @param {WebGLRenderTarget} writeBuffer - the buffer to render to, or null to render directly to screen.
   * @param {WebGLRenderTarget} readBuffer - the buffer to read from.
   */
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget) {
    this._copyShader.render(renderer, this._readBuffer, readBuffer);
    for (const effect of Object.values(this._effects)) {
      effect.render(renderer, this._writeBuffer, this._readBuffer);
      this._swapBuffers();
    }
    this._copyShader.render(renderer, this.renderToScreen ? null : writeBuffer, this._readBuffer);
  }

  /**
   * Disposes this object. Call when this object is no longer needed, otherwise leaks may occur.
   */
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

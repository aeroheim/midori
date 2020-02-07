import { WebGLRenderTarget, Vector2, Shader, ShaderMaterial, WebGLRenderer, PerspectiveCamera, DepthTexture } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { BlendShader } from 'three/examples/jsm/shaders/BlendShader';
import { MotionBlurShader } from './shaders/effect/motion-blur-shader';
import { GaussianBlurShader, GaussianBlurDirection } from './shaders/effect/gaussian-blur-shader';
import { VignetteBlendShader } from './shaders/effect/vignette-blend-shader';
import { GlitchShader } from './shaders/transition/glitch-shader';
import { ShaderUtils, Uniforms } from './shaders/shader-utils';

export enum EffectType {
  Blur,
  Bloom,
  RgbShift,
  Vignette,
  VignetteBlur,
  MotionBlur,
  Glitch,
}

export interface IEffect {
  render(...args: any[]);
  setSize?(width: number, height: number);
  getUniforms(): Uniforms;
  updateUniforms(uniforms: Uniforms);
  clearUniforms();
  dispose();
}

class Effect implements IEffect {
  protected _quad: Pass.FullScreenQuad = new Pass.FullScreenQuad();

  /**
   * Contructs an effect.
   * @param {Shader} shader - a shader definition.
   * @param {Uniforms} uniforms - uniforms for the shader.
   */
  constructor(shader: Shader, uniforms: Uniforms = {}) {
    this._quad.material = ShaderUtils.createShaderMaterial(shader, uniforms);
  }

  /**
   * Returns the current uniforms for the effect.
   * @returns Uniforms
   */
  getUniforms(): Uniforms {
    return ShaderUtils.getUniforms(this._quad.material as ShaderMaterial);
  }

  /**
   * Updates the specified uniforms for the effect.
   * @param {Uniforms} uniforms
   */
  updateUniforms(uniforms: Uniforms = {}) {
    ShaderUtils.updateUniforms(this._quad.material as ShaderMaterial, uniforms);
  }

  /**
   * Resets the uniforms for the effect back to its default values.
   */
  clearUniforms() {
    ShaderUtils.clearUniforms(this._quad.material as ShaderMaterial);
  }

  /**
   * Renders the effect.
   * @param {WebGLRenderer} renderer - the renderer to use.
   * @param {WebGLRenderTarget} writeBuffer - the buffer to render to, or null to render directly to screen.
   * @param {WebGLRenderTarget} readBuffer - the buffer to read from.
   * @param {Uniforms} uniforms - uniforms values to update before rendering.
   */
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, uniforms: Uniforms = {}) {
    renderer.setRenderTarget(writeBuffer);
    this.updateUniforms({
      ...uniforms,
      tDiffuse: readBuffer.texture,
    });
    this._quad.render(renderer);
  }

  /**
   * Disposes this object. Call when this object is no longer needed, otherwise leaks may occur.
   */
  dispose() {
    this._quad.material.dispose();
  }
}

class TransitionEffect extends Effect {
  /**
   * Renders the effect.
   * @param {WebGLRenderer} renderer - the renderer to use.
   * @param {WebGLRenderTarget} writeBuffer - the buffer to render to, or null to render directly to screen.
   * @param {WebGLRenderTarget} fromBuffer - the buffer to transition from.
   * @param {WebGLRenderTarget} toBuffer - the buffer to transition to.
   * @param {Uniforms} uniforms - uniform values to update before rendering.
   */
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, fromBuffer: WebGLRenderTarget, toBuffer: WebGLRenderTarget, uniforms: Uniforms = {}) {
    renderer.setRenderTarget(writeBuffer);
    this.updateUniforms({
      ...uniforms,
      tDiffuse1: fromBuffer.texture,
      tDiffuse2: toBuffer.texture,
    });
    this._quad.render(renderer);
  }
}

class MotionBlurEffect extends Effect {
  camera: PerspectiveCamera;
  depthTexture: DepthTexture;

  /**
   * Constructs a MotionBlurEffect.
   * @param {PerspectiveCamera} camera - a three.js PerspectiveCamera.
   * @param {DepthTexture} depthTexture - a three.js DepthTexture.
   * @param {Uniforms} uniforms - uniforms for the shader.
   */
  constructor(camera: PerspectiveCamera, depthTexture: DepthTexture, uniforms: Uniforms = {}) {
    super(MotionBlurShader, uniforms);

    this.camera = camera;
    this.depthTexture = depthTexture;
  }

  /**
   * Renders the effect.
   * @param {WebGLRenderer} renderer - the renderer to use.
   * @param {WebGLRenderTarget} writeBuffer - the buffer to render to, or null to render directly to screen.
   * @param {WebGLRenderTarget} readBuffer - the buffer to read from.
   * @param {Uniforms} uniforms - uniform values to update before rendering.
   */
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, uniforms: Uniforms = {}) {
    const { clipToWorldMatrix, prevWorldToClipMatrix } = this.getUniforms();

    // the clip to world space matrix is calculated using the inverse projection-view matrix
    // NOTE: camera.matrixWorld is the inverse view matrix of the camera (instead of matrixWorldInverse)
    super.render(renderer, writeBuffer, readBuffer, {
      ...uniforms,
      tDepth: this.depthTexture,
      clipToWorldMatrix: clipToWorldMatrix.copy(this.camera.projectionMatrixInverse).multiply(this.camera.matrixWorld),
    });

    // the world to clip space matrix is calculated using the view-projection matrix
    prevWorldToClipMatrix.copy(this.camera.matrixWorldInverse).multiply(this.camera.projectionMatrix);
  }
}

class GaussianBlurEffect extends Effect {
  private _width: number;
  private _height: number;
  private _buffer: WebGLRenderTarget;

  // the number of blur passes to perform - more passes are expensive but result in stronger blurs and less artifacts.
  passes = 1;

  /**
   * Constructs a GaussianBlurEffect.
   * @param {number} width
   * @param {number} height
   * @param {Uniforms} uniforms - uniforms for the shader.
   */
  constructor(width: number, height: number, uniforms: Uniforms = {}) {
    super(GaussianBlurShader, uniforms);
    this._width = width;
    this._height = height;
    this._buffer = new WebGLRenderTarget(width, height);
  }

  /**
   * Sets the size of the effect.
   * @param {number} width
   * @param {number} height
   */
  setSize(width: number, height: number) {
    this._width = width;
    this._height = height;
    this._buffer.setSize(width, height);
  }

  /**
   * Renders the effect.
   * @param {WebGLRenderer} renderer - the renderer to use.
   * @param {WebGLRenderTarget} writeBuffer - the buffer to render to, or null to render directly to screen.
   * @param {WebGLRenderTarget} readBuffer - the buffer to read from.
   * @param {Uniforms} uniforms - uniform values to update before rendering.
   */
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, uniforms: Uniforms = {}) {
    for (let i = 0; i < this.passes; ++i) {
      super.render(renderer, this._buffer, i === 0 ? readBuffer : writeBuffer, {
        ...uniforms,
        direction: GaussianBlurDirection.HORIZONTAL,
        resolution: this._width,
      });
      super.render(renderer, writeBuffer, this._buffer, {
        ...uniforms,
        direction: GaussianBlurDirection.VERTICAL,
        resolution: this._height,
      });
    }
  }

  /**
   * Disposes this object. Call when this object is no longer needed, otherwise leaks may occur.
   */
  dispose() {
    this._buffer.dispose();
    super.dispose();
  }
}

class VignetteBlurEffect implements IEffect {
  private _blurEffect: GaussianBlurEffect;
  private _blendEffect: TransitionEffect;
  private _blendBuffer: WebGLRenderTarget;

  /**
   * Constructs a VignetteBlurEffect.
   * @param {number} width
   * @param {number} height
   * @param {Uniforms} uniforms - uniforms for the shader.
   */
  constructor(width: number, height: number, uniforms: Uniforms = {}) {
    this._blurEffect = new GaussianBlurEffect(width, height);
    this._blendEffect = new TransitionEffect(VignetteBlendShader);
    this._blendBuffer = new WebGLRenderTarget(width, height);
    this.updateUniforms(uniforms);
  }

  /**
   * The number of blur passes to perform. More passes are expensive but result in stronger blurs and less artifacts.
   * @returns number
   */
  get passes(): number {
    return this._blurEffect.passes;
  }

  /**
   * @param {number} value
   */
  set passes(value: number) {
    this._blurEffect.passes = value;
  }

  /**
   * Sets the size of the effect.
   * @param {number} width
   * @param {number} height
   */
  setSize(width: number, height: number) {
    this._blurEffect.setSize(width, height);
    this._blendBuffer.setSize(width, height);
  }

  /**
   * Returns the current uniforms for the effect.
   * @returns Uniforms
   */
  getUniforms(): Uniforms {
    const { opacity, size } = this._blendEffect.getUniforms();
    return { ...this._blurEffect.getUniforms(), opacity, size };
  }

  /**
   * Updates the specified uniforms for the effect.
   * @param {Uniforms} uniforms
   */
  updateUniforms(uniforms: Uniforms = {}) {
    const blendUniforms = this._blendEffect.getUniforms();
    const { opacity = blendUniforms.opacity, size = blendUniforms.size, ...blurUniforms } = uniforms;
    this._blurEffect.updateUniforms(blurUniforms);
    this._blendEffect.updateUniforms({ opacity, size });
  }

  /**
   * Resets the uniforms for the effect back to its default values.
   */
  clearUniforms() {
    this._blurEffect.clearUniforms();
    this._blendEffect.clearUniforms();
  }

  /**
   * Renders the effect.
   * @param {WebGLRenderer} renderer - the renderer to use.
   * @param {WebGLRenderTarget} writeBuffer - the buffer to render to, or null to render directly to screen.
   * @param {WebGLRenderTarget} readBuffer - the buffer to read from.
   * @param {Uniforms} uniforms - uniform values to update before rendering.
   */
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, uniforms: Uniforms = {}) {
    this._blurEffect.render(renderer, this._blendBuffer, readBuffer, uniforms);
    this._blendEffect.render(renderer, writeBuffer, readBuffer, this._blendBuffer);
  }

  /**
   * Disposes this object. Call when this object is no longer needed, otherwise leaks may occur.
   */
  dispose() {
    this._blurEffect.dispose();
    this._blendEffect.dispose();
    this._blendBuffer.dispose();
  }
}

class BloomEffect implements IEffect {
  private _blurEffect: GaussianBlurEffect;
  private _blendEffect: TransitionEffect;
  private _blendBuffer: WebGLRenderTarget;

  /**
   * Constructs a BloomEffect.
   * @param {number} width
   * @param {number} height
   * @param {Uniforms} uniforms - uniforms for the shader.
   */
  constructor(width: number, height: number, uniforms: Uniforms = {}) {
    this._blurEffect = new GaussianBlurEffect(width, height);
    this._blendEffect = new TransitionEffect(BlendShader, { mixRatio: 0.5 });
    this._blendBuffer = new WebGLRenderTarget(width, height);
    this.updateUniforms(uniforms);
  }

  /**
   * The number of blur passes to perform. More passes are expensive but result in stronger blurs and less artifacts.
   * @returns number
   */
  get passes() {
    return this._blurEffect.passes;
  }

  /**
   * @param {number} value
   */
  set passes(value: number) {
    this._blurEffect.passes = value;
  }

  /**
   * Sets the size of the effect.
   * @param {number} width
   * @param {number} height
   */
  setSize(width: number, height: number) {
    this._blurEffect.setSize(width, height);
    this._blendBuffer.setSize(width, height);
  }

  /**
   * Returns the current uniforms for the effect.
   * @returns Uniforms
   */
  getUniforms(): Uniforms {
    const { opacity } = this._blendEffect.getUniforms();
    return { ...this._blurEffect.getUniforms(), opacity };
  }

  /**
   * Updates the specified uniforms for the effect.
   * @param {Uniforms} uniforms
   */
  updateUniforms(uniforms: Uniforms = {}) {
    const blendUniforms = this._blendEffect.getUniforms();
    const { opacity = blendUniforms.opacity, ...blurUniforms } = uniforms;
    this._blurEffect.updateUniforms(blurUniforms);
    this._blendEffect.updateUniforms({ opacity });
  }

  /**
   * Resets the uniforms for the effect back to its default values.
   */
  clearUniforms() {
    this._blurEffect.clearUniforms();
    this._blendEffect.clearUniforms();
    this._blendEffect.updateUniforms({ mixRatio: 0.5 });
  }

  /**
   * Renders the effect.
   * @param {WebGLRenderer} renderer - the renderer to use.
   * @param {WebGLRenderTarget} writeBuffer - the buffer to render to, or null to render directly to screen.
   * @param {WebGLRenderTarget} readBuffer - the buffer to read from.
   * @param {Uniforms} uniforms - uniform values to update before rendering.
   */
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, uniforms: Uniforms = {}) {
    this._blurEffect.render(renderer, this._blendBuffer, readBuffer, uniforms);
    this._blendEffect.render(renderer, writeBuffer, readBuffer, this._blendBuffer);
  }

  /**
   * Disposes this object. Call when this object is no longer needed, otherwise leaks may occur.
   */
  dispose() {
    this._blendEffect.dispose();
    this._blendBuffer.dispose();
  }
}

class GlitchEffect implements IEffect {
  private _resolution: Vector2;
  private _glitchEffect: TransitionEffect;
  private _blurEffect: GaussianBlurEffect;
  private _blurBuffer: WebGLRenderTarget;

  /**
   * Constructs a GlitchEffect.
   * @param {number} width
   * @param {number} height
   * @param {Uniforms} uniforms - uniforms for the shader.
   */
  constructor(width: number, height: number, uniforms: Uniforms = {}) {
    this._resolution = new Vector2(width, height);
    this._glitchEffect = new TransitionEffect(GlitchShader);
    this._blurEffect = new GaussianBlurEffect(width, height, { radius: 3 });
    this._blurEffect.passes = 2;
    this._blurBuffer = new WebGLRenderTarget(width, height);
    this.updateUniforms(uniforms);
  }

  /**
   * Sets the size for the effect.
   * @param {number} width
   * @param {number} height
   */
  setSize(width: number, height: number) {
    this._resolution.set(width, height);
    this._blurEffect.setSize(width, height);
    this._blurBuffer.setSize(width, height);
  }

  /**
   * Returns the current uniforms for the effect.
   * @returns Uniforms
   */
  getUniforms(): Uniforms {
    return this._glitchEffect.getUniforms();
  }

  /**
   * Updates the specified uniforms for the effect.
   * @param {Uniforms} uniforms
   */
  updateUniforms(uniforms: Uniforms = {}) {
    this._glitchEffect.updateUniforms(uniforms);
  }

  /**
   * Resets the uniforms for the effect back to its default values.
   */
  clearUniforms() {
    this._glitchEffect.clearUniforms();
  }

  /**
   * Renders the effect.
   * @param {WebGLRenderer} renderer - the renderer to use.
   * @param {WebGLRenderTarget} writeBuffer - the buffer to render to, or null to render directly to screen.
   * @param {WebGLRenderTarget} readBuffer - the buffer to read from.
   * @param {Uniforms} uniforms - uniform values to update before rendering.
   */
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, uniforms: Uniforms = {}) {
    this._blurEffect.render(renderer, this._blurBuffer, readBuffer);
    this._glitchEffect.render(renderer, writeBuffer, readBuffer, this._blurBuffer, {
      ...uniforms,
      resolution: this._resolution,
    });
  }

  /**
   * Disposes this object. Call when this object is no longer needed, otherwise leaks may occur.
   */
  dispose() {
    this._glitchEffect.dispose();
    this._blurEffect.dispose();
    this._blurBuffer.dispose();
  }
}

export {
  Effect,
  TransitionEffect,
  MotionBlurEffect,
  GaussianBlurEffect,
  VignetteBlurEffect,
  BloomEffect,
  GlitchEffect,
};

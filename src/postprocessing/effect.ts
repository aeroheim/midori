import { WebGLRenderTarget, Vector2 } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { BlendShader } from 'three/examples/jsm/shaders/BlendShader';
import { MotionBlurShader } from './shaders/effect/motion-blur-shader';
import { GaussianBlurShader, GaussianBlurDirection } from './shaders/effect/gaussian-blur-shader';
import { VignetteBlendShader } from './shaders/effect/vignette-blend-shader';
import { GlitchShader } from './shaders/transition/glitch-shader';
import { ShaderUtils } from './shaders/shader-utils';

const EffectType = Object.freeze({
  BLUR: 'blur',
  BLOOM: 'bloom',
  RGB_SHIFT: 'rgbShift',
  VIGNETTE: 'vignette',
  VIGNETTE_BLUR: 'vignetteBlur',
  MOTION_BLUR: 'motionBlur',
  GLITCH: 'glitch',
});

class Effect {
  _quad = new Pass.FullScreenQuad();

  constructor(shader, uniforms = {}) {
    this._quad.material = ShaderUtils.createShaderMaterial(shader, uniforms);
  }

  getUniforms() {
    return ShaderUtils.getUniforms(this._quad.material);
  }

  updateUniforms(uniforms = {}) {
    ShaderUtils.updateUniforms(this._quad.material, uniforms);
  }

  clearUniforms() {
    ShaderUtils.clearUniforms(this._quad.material);
  }

  render(renderer, writeBuffer, readBuffer, uniforms = {}) {
    renderer.setRenderTarget(writeBuffer);
    this.updateUniforms({
      ...uniforms,
      tDiffuse: readBuffer.texture,
    });
    this._quad.render(renderer);
  }

  dispose() {
    this._quad.material.dispose();
  }
}

class TransitionEffect extends Effect {
  render(renderer, writeBuffer, fromBuffer, toBuffer, uniforms = {}) {
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
  camera;
  depthBuffer;

  constructor(camera, depthBuffer, uniforms = {}) {
    super(MotionBlurShader, uniforms);

    this.camera = camera;
    this.depthBuffer = depthBuffer;
  }

  render(renderer, writeBuffer, readBuffer, uniforms = {}) {
    const { clipToWorldMatrix, prevWorldToClipMatrix } = this.getUniforms();

    // the clip to world space matrix is calculated using the inverse projection-view matrix
    // NOTE: camera.matrixWorld is the inverse view matrix of the camera (instead of matrixWorldInverse)
    super.render(renderer, writeBuffer, readBuffer, {
      ...uniforms,
      tDepth: this.depthBuffer,
      clipToWorldMatrix: clipToWorldMatrix.copy(this.camera.projectionMatrixInverse).multiply(this.camera.matrixWorld),
    });

    // the world to clip space matrix is calculated using the view-projection matrix
    prevWorldToClipMatrix.copy(this.camera.matrixWorldInverse).multiply(this.camera.projectionMatrix);
  }
}

class GaussianBlurEffect extends Effect {
  _width;
  _height;
  _buffer;

  passes = 1;

  constructor(width, height, uniforms = {}) {
    super(GaussianBlurShader, uniforms);
    this._width = width;
    this._height = height;
    this._buffer = new WebGLRenderTarget(width, height);
  }

  setSize(width, height) {
    this._width = width;
    this._height = height;
    this._buffer.setSize(width, height);
  }

  render(renderer, writeBuffer, readBuffer, uniforms = {}) {
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

  dispose() {
    this._buffer.dispose();
    super.dispose();
  }
}

class VignetteBlurEffect {
  _blurEffect;
  _blendEffect;
  _blendBuffer;

  constructor(width, height) {
    this._blurEffect = new GaussianBlurEffect(width, height);
    this._blendEffect = new TransitionEffect(VignetteBlendShader);
    this._blendBuffer = new WebGLRenderTarget(width, height);
  }

  get passes() {
    return this._blurEffect.passes;
  }

  set passes(value) {
    this._blurEffect.passes = value;
  }

  setSize(width, height) {
    this._blurEffect.setSize(width, height);
    this._blendBuffer.setSize(width, height);
  }

  getUniforms() {
    const { opacity, size } = this._blendEffect.getUniforms();
    return { ...this._blurEffect.getUniforms(), opacity, size };
  }

  updateUniforms(uniforms = {}) {
    const blendUniforms = this._blendEffect.getUniforms();
    const { opacity = blendUniforms.opacity, size = blendUniforms.size, ...blurUniforms } = uniforms;
    this._blurEffect.updateUniforms(blurUniforms);
    this._blendEffect.updateUniforms({ opacity, size });
  }

  clearUniforms() {
    this._blurEffect.clearUniforms();
    this._blendEffect.clearUniforms();
  }

  render(renderer, writeBuffer, readBuffer, uniforms = {}) {
    this._blurEffect.render(renderer, this._blendBuffer, readBuffer, uniforms);
    this._blendEffect.render(renderer, writeBuffer, readBuffer, this._blendBuffer);
  }

  dispose() {
    this._blurEffect.dispose();
    this._blendEffect.dispose();
    this._blendBuffer.dispose();
  }
}

class BloomEffect {
  _blurEffect;
  _blendEffect;
  _blendBuffer;

  constructor(width, height) {
    this._blurEffect = new GaussianBlurEffect(width, height);
    this._blendEffect = new TransitionEffect(BlendShader, { mixRatio: 0.5 });
    this._blendBuffer = new WebGLRenderTarget(width, height);
  }

  get passes() {
    return this._blurEffect.passes;
  }

  set passes(value) {
    this._blurEffect.passes = value;
  }

  setSize(width, height) {
    this._blurEffect.setSize(width, height);
    this._blendBuffer.setSize(width, height);
  }

  getUniforms() {
    const { opacity } = this._blendEffect.getUniforms();
    return { ...this._blurEffect.getUniforms(), opacity };
  }

  updateUniforms(uniforms = {}) {
    const blendUniforms = this._blendEffect.getUniforms();
    const { opacity = blendUniforms.opacity, ...blurUniforms } = uniforms;
    this._blurEffect.updateUniforms(blurUniforms);
    this._blendEffect.updateUniforms({ opacity });
  }

  clearUniforms() {
    this._blurEffect.clearUniforms();
    this._blendEffect.clearUniforms();
    this._blendEffect.updateUniforms({ mixRatio: 0.5 });
  }

  render(renderer, writeBuffer, readBuffer, uniforms = {}) {
    this._blurEffect.render(renderer, this._blendBuffer, readBuffer, uniforms);
    this._blendEffect.render(renderer, writeBuffer, readBuffer, this._blendBuffer);
  }

  dispose() {
    this._blendEffect.dispose();
    this._blendBuffer.dispose();
  }
}

class GlitchEffect {
  _resolution;
  _glitchEffect;
  _blurEffect;
  _blurBuffer;

  constructor(width, height, uniforms = {}) {
    this._resolution = new Vector2(width, height);
    this._glitchEffect = new TransitionEffect(GlitchShader, uniforms);
    this._blurEffect = new GaussianBlurEffect(width, height, { radius: 3 });
    this._blurEffect.passes = 2;
    this._blurBuffer = new WebGLRenderTarget(width, height);
  }

  setSize(width, height) {
    this._resolution.set(width, height);
    this._blurEffect.setSize(width, height);
    this._blurBuffer.setSize(width, height);
  }

  getUniforms() {
    return this._glitchEffect.getUniforms();
  }

  updateUniforms(uniforms = {}) {
    this._glitchEffect.updateUniforms(uniforms);
  }

  clearUniforms() {
    this._glitchEffect.clearUniforms();
  }

  render(renderer, writeBuffer, readBuffer, uniforms = {}) {
    this._blurEffect.render(renderer, this._blurBuffer, readBuffer);
    this._glitchEffect.render(renderer, writeBuffer, readBuffer, this._blurBuffer, {
      ...uniforms,
      resolution: this._resolution,
    });
  }

  dispose() {
    this._glitchEffect.dispose();
    this._blurEffect.dispose();
    this._blurBuffer.dispose();
  }
}

export {
  EffectType,
  Effect,
  TransitionEffect,
  MotionBlurEffect,
  GaussianBlurEffect,
  VignetteBlurEffect,
  BloomEffect,
  GlitchEffect,
};

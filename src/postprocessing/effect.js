import { WebGLRenderTarget } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { BlendShader } from 'three/examples/jsm/shaders/BlendShader';
import { MotionBlurShader } from './shaders/effect/motion-blur-shader';
import { GaussianBlurShader, GaussianBlurDirection } from './shaders/effect/gaussian-blur-shader';
import { ShaderUtils } from './shaders/shader-utils';

const EffectType = Object.freeze({
  BLUR: 'blur',
  BLOOM: 'bloom',
  RGB_SHIFT: 'rgbShift',
  VIGNETTE: 'vignette',
  MOTION_BLUR: 'motionBlur',
  PARTICLE: 'particle',
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

class BloomEffect extends GaussianBlurEffect {
  _blendEffect;
  _blendBuffer;

  constructor(width, height) {
    super(width, height);
    this._blendEffect = new TransitionEffect(BlendShader, { mixRatio: 0.5 });
    this._blendBuffer = new WebGLRenderTarget(width, height);
  }

  setSize(width, height) {
    super.setSize(width, height);
    this._blendBuffer.setSize(width, height);
  }

  getUniforms() {
    const { opacity } = this._blendEffect.getUniforms();
    return { ...super.getUniforms(), opacity };
  }

  updateUniforms(uniforms = {}) {
    const { opacity, ...blurUniforms } = uniforms;
    super.updateUniforms(blurUniforms);
    if (opacity !== undefined) {
      this._blendEffect.updateUniforms({ opacity });
    }
  }

  clearUniforms() {
    super.clearUniforms();
    this._blendEffect.clearUniforms();
    this._blendEffect.updateUniforms({ mixRatio: 0.5 });
  }

  render(renderer, writeBuffer, readBuffer, uniforms = {}) {
    super.render(renderer, this._blendBuffer, readBuffer, uniforms);
    this._blendEffect.render(renderer, writeBuffer, readBuffer, this._blendBuffer);
  }

  dispose() {
    this._blendEffect.dispose();
    this._blendBuffer.dispose();
    super.dispose();
  }
}

export {
  EffectType,
  Effect,
  TransitionEffect,
  MotionBlurEffect,
  GaussianBlurEffect,
  BloomEffect,
};

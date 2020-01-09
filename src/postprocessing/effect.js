import { WebGLRenderTarget } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { ShaderUtils } from './shaders/shader-utils';
import { MotionBlurShader } from './shaders/transition/motion-blur-shader';
import { GaussianBlurShader, GaussianBlurDirection } from './shaders/effect/gaussian-blur-shader';

const EffectType = Object.freeze({
  BLUR: 'blur',
  BLOOM: 'bloom',
  RGB_SHIFT: 'rgbShift',
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
    return ShaderUtils.updateUniforms(this._quad.material, uniforms);
  }

  clearUniforms() {
    ShaderUtils.clearUniforms(this._quad.material);
  }

  render(renderer, writeBuffer, uniforms = {}) {
    renderer.setRenderTarget(writeBuffer);
    this.updateUniforms(uniforms);
    this._quad.render(renderer);
  }

  dispose() {
    this._quad.material.dispose();
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

  render(renderer, writeBuffer, uniforms = {}) {
    const { clipToWorldMatrix, prevWorldToClipMatrix } = this.getUniforms();

    // the clip to world space matrix is calculated using the inverse projection-view matrix
    // NOTE: camera.matrixWorld is the inverse view matrix of the camera (instead of matrixWorldInverse)
    super.render(renderer, writeBuffer, {
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

  render(renderer, writeBuffer, uniforms = {}) {
    const { tDiffuse } = uniforms;
    for (let i = 0; i < this.passes; ++i) {
      super.render(renderer, this._buffer, {
        ...uniforms,
        tDiffuse: i === 0 ? tDiffuse : writeBuffer.texture,
        direction: GaussianBlurDirection.HORIZONTAL,
        resolution: this._width,
      });
      super.render(renderer, writeBuffer, {
        ...uniforms,
        tDiffuse: this._buffer.texture,
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

export {
  EffectType,
  Effect,
  MotionBlurEffect,
  GaussianBlurEffect,
};

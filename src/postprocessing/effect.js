import { Matrix4 } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { ShaderUtils } from './shaders/shader-utils';
import { MotionBlurShader } from './shaders/transition/motion-blur-shader';

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

  render(renderer, uniforms = {}) {
    this.updateUniforms(uniforms);
    this._quad.render(renderer);
  }

  dispose() {
    this._quad.material.dispose();
  }
}

class MotionBlurEffect extends Effect {
  _camera;
  _depthBuffer;

  constructor(camera, depthBuffer, uniforms = {}) {
    super(MotionBlurShader, uniforms);

    this._camera = camera;
    this._depthBuffer = depthBuffer;
    this.updateUniforms({
      tDepth: depthBuffer,
      clipToWorldMatrix: new Matrix4(),
      prevWorldToClipMatrix: new Matrix4(),
    });
  }

  updateUniforms(uniforms = {}, camera, depthBuffer) {
    this._camera = camera || this._camera;
    this._depthBuffer = depthBuffer || this._depthBuffer;
    super.updateUniforms({
      ...uniforms,
      tDepth: this._depthBuffer,
    });
  }

  render(renderer, uniforms = {}) {
    const { clipToWorldMatrix, prevWorldToClipMatrix } = this.getUniforms();

    // the clip to world space matrix is calculated using the inverse projection-view matrix
    // NOTE: camera.matrixWorld is the inverse view matrix of the camera (instead of matrixWorldInverse)
    super.render(renderer, {
      ...uniforms,
      clipToWorldMatrix: clipToWorldMatrix.copy(this._camera.projectionMatrixInverse).multiply(this._camera.matrixWorld),
    });

    // the world to clip space matrix is calculated using the view-projection matrix
    prevWorldToClipMatrix.copy(this._camera.matrixWorldInverse).multiply(this._camera.projectionMatrix);
  }
}

export {
  EffectType,
  Effect,
  MotionBlurEffect,
};

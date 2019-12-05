import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { ShaderMaterial, UniformsUtils, Matrix4 } from 'three';
import { MotionBlurShader } from './shaders/motion-blur-shader';

const EffectType = Object.freeze({
  RGB_SHIFT: 'rgbShift',
  BLOOM: 'bloom',
  BLUR: 'blur',
  MOTION_BLUR: 'motionBlur',
  DOF: 'dof',
  GLITCH: 'glitch',
  PARTICLE: 'particle',
});

class EffectPassShader {
  _quad = new Pass.FullScreenQuad();

  constructor(shader) {
    this._quad.material = new ShaderMaterial({
      uniforms: UniformsUtils.clone(shader.uniforms),
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
    });
  }

  get uniforms() {
    return this._quad.material.uniforms;
  }

  setUniforms(uniforms = {}) {
    for (const uniform in uniforms) {
      this._quad.material.uniforms[uniform].value = uniforms[uniform];
    }
  }

  render(renderer) {
    this._quad.render(renderer);
  }

  dispose() {
    this._quad.material.dispose();
  }
}

const EffectState = Object.freeze({
  INACTIVE: 'inactive',
  ACTIVE: 'active',
  PERSiSTENT: 'persistent',
});

class EffectPass extends Pass {
  _effectStates = {
    [EffectType.RGB_SHIFT]: EffectState.INACTIVE,
    [EffectType.BLOOM]: EffectState.INACTIVE,
    [EffectType.BLUR]: EffectState.INACTIVE,
    [EffectType.MOTION_BLUR]: EffectState.INACTIVE,
    [EffectType.DOF]: EffectState.INACTIVE,
    [EffectType.GLITCH]: EffectState.INACTIVE,
    [EffectType.PARTICLE]: EffectState.INACTIVE,
  };

  _motionBlurShader = new EffectPassShader(MotionBlurShader);

  // TODO: accepts a config + tween for a one-time effect animation
  /*
  effect() {

  }
  */

  // TODO: accept configurable variance/sway for certain effects
  setPersistentEffect(type, config = {}) {
    if (type in this._effectStates) {
      this._effectStates[type] = EffectState.PERSISTENT;
      this.enabled = true;
    }

    switch (type) {
      case EffectType.MOTION_BLUR: {
        const { intensity = 3.5, camera, depthTexture: tDepth } = config;
        this._motionBlurShader.camera = camera;
        this._motionBlurShader.setUniforms({
          clipToWorldMatrix: new Matrix4(),
          prevWorldToClipMatrix: new Matrix4(),
          tDepth,
          intensity,
        });
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

  stopPersistentEffect(type) {
    if (type in this._effectStates) {
      this._effectStates[type] = EffectState.INACTIVE;
    }
    if (Object.values(this._effectStates).every(x => x === EffectState.INACTIVE)) {
      this.enabled = false;
    }
  }

  render(renderer, writeBuffer, readBuffer /* deltaTime, maskActive */) {
    if (this._effectStates[EffectType.MOTION_BLUR] !== EffectState.INACTIVE) {
      const { camera } = this._motionBlurShader;
      const { clipToWorldMatrix, prevWorldToClipMatrix } = this._motionBlurShader.uniforms;

      // the clip to world space matrix is calculated using the inverse projection-view matrix
      // NOTE: camera.matrixWorld is actually the inverse view matrix of the camera (instead of matrixWorldInverse...)
      this._motionBlurShader.setUniforms({
        tDiffuse: readBuffer.texture,
        clipToWorldMatrix: clipToWorldMatrix.value.copy(camera.projectionMatrixInverse).multiply(camera.matrixWorld),
      });

      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      this._motionBlurShader.render(renderer);

      // the world to clip space matrix is calculated using the view-projection matrix
      prevWorldToClipMatrix.value.copy(camera.matrixWorldInverse).multiply(camera.projectionMatrix);
    }
  }
}

export {
  EffectType,
  EffectPass,
};

export default EffectPass;

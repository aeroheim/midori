import { WebGLRenderTarget, DepthTexture, ShaderMaterial, UniformsUtils, Matrix4 } from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { MotionBlurShader } from './shaders/motion-blur';

class MotionBlurPass extends Pass {
  scene;
  camera;
  _buffer;
  _quad;
  _clipToWorldMatrix = new Matrix4();
  _prevWorldToClipMatrix = new Matrix4();

  constructor(scene, camera, width, height) {
    super();
    this.scene = scene;
    this.camera = camera;
    this._buffer = new WebGLRenderTarget(width, height);
    this._buffer.depthTexture = new DepthTexture(width, height);
    this._quad = new Pass.FullScreenQuad(new ShaderMaterial({
      uniforms: UniformsUtils.clone(MotionBlurShader.uniforms),
      vertexShader: MotionBlurShader.vertexShader,
      fragmentShader: MotionBlurShader.fragmentShader,
    }));
  }

  setSize(width, height) {
    super.setSize(width, height);
    this._buffer.setSize(width, height);
    this._buffer.depthTexture.image.width = width;
    this._buffer.depthTexture.image.height = height;
  }

  render(renderer, writeBuffer /* readBuffer, deltaTime, maskActive */) {
    const { material: shader } = this._quad;

    renderer.setRenderTarget(this._buffer);
    renderer.render(this.scene, this.camera);

    // the clip to world space matrix is calculated using the inverse projection-view matrix
    // NOTE: camera.matrixWorld is actually the inverse view matrix of the camera (instead of matrixWorldInverse...)
    this._clipToWorldMatrix.copy(this.camera.projectionMatrixInverse).multiply(this.camera.matrixWorld);

    shader.uniforms.tDiffuse.value = this._buffer.texture;
    shader.uniforms.tDepth.value = this._buffer.depthTexture;
    shader.uniforms.clipToWorldMatrix.value = this._clipToWorldMatrix;
    shader.uniforms.prevWorldToClipMatrix.value = this._prevWorldToClipMatrix;

    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this._quad.render(renderer);

    // the world to clip space matrix is calculated using the view-projection matrix
    this._prevWorldToClipMatrix.copy(this.camera.matrixWorldInverse).multiply(this.camera.projectionMatrix);
  }
}

export default MotionBlurPass;

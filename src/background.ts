import { WebGLRenderTarget, Scene, Mesh, PlaneGeometry, MeshBasicMaterial, DepthTexture, Texture, WebGLRenderer } from 'three';
import { BackgroundCamera, getMaxFullScreenDepthForPlane } from './background-camera';
import { EffectPass } from './postprocessing/effect-pass';
import { EffectType } from './postprocessing/effect';
import { Particles } from './particles';

export interface PlaneMesh extends Mesh {
  geometry: PlaneGeometry;
  material: MeshBasicMaterial;
}

class Background {
  private readonly _buffer: WebGLRenderTarget;
  private readonly _plane: PlaneMesh;
  private readonly _scene: Scene;
  readonly camera: BackgroundCamera;
  readonly particles: Particles;
  readonly effects: EffectPass;

  /**
   * Constructs a background.
   * @param {Texture} texture
   * @param {number} width
   * @param {number} height
   */
  constructor(texture: Texture, width: number, height: number) {
    // primary buffer - store depth texture for use in motion blur
    this._buffer = new WebGLRenderTarget(width, height);
    this._buffer.depthTexture = new DepthTexture(width, height);

    // plane using texture - dimensions are in world units
    const textureAspectRatio = texture && texture.image
      ? texture.image.width / texture.image.height
      : 1;
    const planeWidth = 1;
    const planeHeight = 1/ textureAspectRatio;
    this._plane = new Mesh(
      new PlaneGeometry(planeWidth, planeHeight),
      new MeshBasicMaterial({ map: texture }),
    ) as PlaneMesh;

    // camera - look at plane
    this.camera = new BackgroundCamera(this._plane, width, height);

    // particles - use slightly larger boundaries to avoid sudden particle pop-ins
    this.particles = new Particles(
      planeWidth * 1.1,
      planeHeight * 1.1,
      getMaxFullScreenDepthForPlane(this._plane, this.camera.camera, 0)
    );

    // effects - set properties required for motion blur
    this.effects = new EffectPass(width, height);
    this.effects.effect(EffectType.MOTION_BLUR, {
      camera: this.camera.camera,
      depthBuffer: this._buffer.depthTexture,
      intensity: 0,
    });

    // scene - throw everything together
    this._scene = new Scene();
    this._scene.add(this.particles.object);
    this._scene.add(this._plane);
  }

  /**
   * Sets the size of the background.
   * @param {number} width
   * @param {number} height
   */
  setSize(width: number, height: number) {
    this.camera.setSize(width, height);
    this._buffer.setSize(width, height);
    this._buffer.depthTexture.image.width = width;
    this._buffer.depthTexture.image.height = height;
  }

  /**
   * Renders the background.
   * @param {WebGLRenderer} renderer - the renderer to use.
   * @param {WebGLRenderTarget} writeBuffer=null - the buffer to render to, or null to render directly to screen.
   */
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget = null) {
    this.camera.update();
    this.particles.update();

    // render to internal buffer to update depth texture
    renderer.setRenderTarget(this._buffer);
    renderer.render(this._scene, this.camera.camera);

    // render to the given write buffer
    if (this.effects.hasEffects()) {
      this.effects.render(renderer, writeBuffer, this._buffer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      renderer.render(this._scene, this.camera.camera);
    }
  }

  /**
   * Disposes this object. Call when this object is no longer needed, otherwise leaks may occur.
   */
  dispose() {
    this._buffer.dispose();
    this._buffer.texture.dispose();
    this._buffer.depthTexture.dispose();
    this._plane.geometry.dispose();
    this._plane.material.dispose();
    this._scene.dispose();
    this.camera.dispose();
    this.effects.dispose();
    this.particles.dispose();
  }
}

export {
  Background,
};

export default Background;

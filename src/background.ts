import { WebGLRenderTarget, Scene, Mesh, PlaneGeometry, MeshBasicMaterial, DepthTexture, Texture, WebGLRenderer } from 'three';
import { BackgroundCamera, getMaxFullScreenDepthForPlane } from './background-camera';
import { EffectPass } from './postprocessing/effect-pass';
import { EffectType } from './postprocessing/effect';
import { Particles } from './particles';

class Background {
  private _buffer: WebGLRenderTarget;
  private _camera: BackgroundCamera;
  private _scene: Scene;
  private _plane: Mesh;
  private _particles: Particles;
  private _effects: EffectPass;

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
    );

    // camera - look at plane
    this._camera = new BackgroundCamera(this._plane, width, height);

    // particles - use slightly larger boundaries to avoid sudden particle pop-ins
    this._particles = new Particles(
      planeWidth * 1.1,
      planeHeight * 1.1,
      getMaxFullScreenDepthForPlane(this._plane, this._camera.camera, 0)
    );

    // effects - set properties required for motion blur
    this._effects = new EffectPass(width, height);
    this._effects.effect(EffectType.MOTION_BLUR, {
      camera: this._camera.camera,
      depthBuffer: this._buffer.depthTexture,
      intensity: 0,
    });

    // scene - throw everything together
    this._scene = new Scene();
    this._scene.add(this._particles.object);
    this._scene.add(this._plane);
  }

  /**
   * Returns the background's camera.
   * @returns BackgroundCamera
   */
  get camera(): BackgroundCamera {
    return this._camera;
  }

  /**
   * Returns the background's particles.
   * @returns Particles
   */
  get particles(): Particles {
    return this._particles;
  }

  /**
   * Returns the background's effects.
   * @returns EffectPass
   */
  get effects(): EffectPass {
    return this._effects;
  }

  /**
   * Sets the size of the background.
   * @param {number} width
   * @param {number} height
   */
  setSize(width: number, height: number) {
    this._camera.setSize(width, height);
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
    this._camera.update();
    this._particles.update();

    // render to internal buffer to update depth texture
    renderer.setRenderTarget(this._buffer);
    renderer.render(this._scene, this._camera.camera);

    // render to the given write buffer
    if (this._effects.hasEffects()) {
      this._effects.render(renderer, writeBuffer, this._buffer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      renderer.render(this._scene, this._camera.camera);
    }
  }

  /**
   * Disposes this object.
   * This should ALWAYS be called when this object is no longer needed, otherwise leaks may occur.
   */
  dispose() {
    this._buffer.dispose();
    this._buffer.texture.dispose();
    this._buffer.depthTexture.dispose();
    this._plane.geometry.dispose();
    (this._plane.material as MeshBasicMaterial).dispose();
    (this._plane.material as MeshBasicMaterial).map.dispose();
    this._scene.dispose();
    this._effects.dispose();
    this._particles.dispose();
  }
}

export {
  Background,
};

export default Background;

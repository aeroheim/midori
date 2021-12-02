
import { PerspectiveCamera, Vector4, MathUtils } from 'three';
import { Tween, Easing } from '@tweenjs/tween.js';
import { getMaxFullScreenDepthForPlane, toAbsolutePosition } from './background-camera-utils';
import { PlaneMesh } from './background';
import { TransitionConfig, LoopableTransitionConfig } from './transition';
import { clamp } from './utils';

interface CameraPosition {
  // the x postion of the camera from 0 to 1, or the left to right-most position respectively.
  x?: number;
  // the y position of the camera from 0 to 1, or the top to bottom-most position respectively.
  y?: number;
  // the z position of the camera from 0 to 1, or the closest to farther position respectively.
  z?: number;
}

interface CameraPositionWithRotation extends CameraPosition {
  // the z-axis rotation of the camera in degrees.
  zr?: number;
}

type CameraOffset = CameraPositionWithRotation;

interface CameraPositionTween {
  x: number,
  y: number,
  z: number
}

interface CameraRotationTween {
  zr: number;
}

interface CameraSwayTween {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  offsetZR: number;
}

// Max camera zoom range - this ensures the camera doesn't exceed the near plane of its frustum.
const CameraZoomRange = 0.9;

class BackgroundCamera {
  private _plane: PlaneMesh;
  public readonly camera: PerspectiveCamera;

  // the relative position of the camera
  // NOTE: the w component is used as the z-axis rotation component of the vector (also aliased as zr)
  private readonly _position: Vector4 = new Vector4(0, 0, 1, 0);
  private readonly _positionOffset: Vector4 = new Vector4(0, 0, 0, 0);
  private readonly _positionWithOffset: Vector4 = this._position.clone(); // cached for re-use per render frame
  private _positionTransition: Tween<CameraPositionTween> = new Tween({ x: 0, y: 0, z: 0 });
  private _rotationTransition: Tween<CameraRotationTween> = new Tween({ zr: 0 });

  private readonly _swayOffset = new Vector4(0, 0, 0, 0);
  private _swayTransition: Tween<CameraSwayTween> = new Tween({ offsetX: 0, offsetY: 0, offsetZ: 0, offsetZR: 0 });

  /**
   * Constructs a BackgroundCamera using a Background's plane.
   * @param {PlaneMesh} plane - a three.js plane mesh representing the background.
   * @param {Number} width - the width of the camera.
   * @param {Number} height - the height of the camera.
   */
  constructor(plane: PlaneMesh, width: number, height: number) {
    this._plane = plane;
    this.camera = new PerspectiveCamera(35, width / height, 0.001);
  }

  /**
   * Returns the current position of the camera.
   * @returns CameraPositionWithRotation
   */
  get position(): CameraPositionWithRotation {
    // NOTE: the relative camera position is the base position and does NOT include offsets (e.g sway or offset).
    const { x, y, z, w: zr } = this._position;
    return { x, y, z, zr };
  }

  /**
   * Returns the current position offset of the camera.
   * @returns CameraPositionWithRotation
   */
  get positionOffset(): CameraPositionWithRotation {
    const { x, y, z, w: zr } = this._positionOffset;
    return { x, y, z, zr };
  }

  /**
   * Returns whether the camera is currently moving.
   * @returns boolean
   */
  isMoving(): boolean {
    return this._positionTransition.isPlaying();
  }

  /**
   * Returns whether the camera is currently rotating.
   * @returns boolean
   */
  isRotating(): boolean {
    return this._rotationTransition.isPlaying();
  }

  /**
   * Returns whether the camera is currently swaying.
   * @returns boolean
   */
  isSwaying(): boolean {
    return this._swayTransition.isPlaying();
  }

  /**
   * Sets the size of the camera.
   * @param {number} width
   * @param {number} height
   */
  setSize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Offsets the camera position.
   * @param {CameraPositionWithRotation} offset - the offset to apply.
   */
  offset(offset: CameraPositionWithRotation): void {
    const { x = 0, y = 0, z = 0, zr = 0 } = offset;
    this._positionOffset.set(x, y, z, zr);
  }

  /**
   * Sways the camera around its position. Cancels any in-progress sways.
   * @param {CameraOffset | boolean} offset - the offset to sway on each axis in relative units from 0 to 1.
   * The rotation offset (zr) must be specified in units of degrees.
   * The x/y offsets should be set based off a z of 1 and will be scaled down appropriately based on the camera's current z position.
   * If a boolean is passed in instead then the sway will either continue or stop based on the value.
   * @param {LoopableTransitionConfig} transition - optional configuration for a transition.
   */
  sway(offset: CameraOffset | boolean, transition: LoopableTransitionConfig = {}): void {
    if (typeof offset === 'boolean') {
      if (!offset) {
        this._swayTransition.stop();
      }
      return;
    }

    this._swayTransition.stop();
    const {
      loop = false,
      duration = 0,
      delay = 0,
      easing = Easing.Linear.None,
      onInit = () => ({}),
      onStart = () => ({}),
      onUpdate = () => ({}),
      onComplete = () => ({}),
      onStop = () => ({}),
    } = transition;

    const { x = 0, y = 0, z = 0, zr = 0 } = offset;
    const zrInRadians = MathUtils.degToRad(zr);

    // calculate offsets within range of available positions
    // NOTE: this doesn't guarantee that sway values won't be clamped since position and offsets can change over time
    // this is still useful enough however to ensure that we won't use sway values that will obviously get clamped
    const xPosition = clamp(this._position.x + this._positionOffset.x, 0, 1);
    const xMin = Math.max(0, xPosition - x);
    const xMax = Math.min(1, xPosition + x);
    const xRange = xMax - xMin;
    const xOffset = (xMin + xRange * Math.random()) - xPosition;

    const yPosition = clamp(this._position.y + this._positionOffset.y, 0, 1);
    const yMin = Math.max(0, yPosition - y);
    const yMax = Math.min(1, yPosition + y);
    const yRange = yMax - yMin;
    const yOffset = (yMin + yRange * Math.random()) - yPosition;

    const zPosition = clamp(this._position.z + this._positionOffset.z, 0, 1);
    const zMin = Math.max(0, zPosition - z);
    const zMax = Math.min(1, zPosition + z);
    const zRange = zMax - zMin;
    const zOffset = (zMin + zRange * Math.random()) - zPosition;

    onInit();
    this._swayTransition = new Tween({
      offsetX: this._swayOffset.x,
      offsetY: this._swayOffset.y,
      offsetZ: this._swayOffset.z,
      offsetZR: this._swayOffset.w,
    })
      .to({
        offsetX: xOffset,
        offsetY: yOffset,
        offsetZ: zOffset,
        offsetZR: -zrInRadians + Math.random() * zrInRadians * 2,
      }, duration * 1000)
      .easing(easing)
      .onStart(onStart)
      .onUpdate(({ offsetX, offsetY, offsetZ, offsetZR }) => {
        this._swayOffset.set(offsetX, offsetY, offsetZ, offsetZR);
        onUpdate();
      })
      .onComplete(() => {
        if (loop) {
          this.sway(offset, transition);
        }
        onComplete();
      })
      .onStop(onStop)
      .delay(delay * 1000)
      .start();
  }

  /**
   * Rotates the camera on its z-axis. Cancels any in-progress rotations.
   * @param {number | boolean} angle - the angle to rotate in degrees.
   * If a boolean is passed in instead then the rotation will either continue or stop based on the value.
   * @param {TransitionConfig} transition - optional configuration for a transition.
   */
  rotate(angle: number | boolean, transition: TransitionConfig = {}): void {
    if (typeof angle === 'boolean') {
      if (!angle) {
        this._rotationTransition.stop();
      }
      return;
    }

    this._rotationTransition.stop();
    const {
      duration = 0,
      delay = 0,
      easing = Easing.Linear.None,
      onInit = () => ({}),
      onStart = () => ({}),
      onUpdate = () => ({}),
      onComplete = () => ({}),
      onStop = () => ({}),
    } = transition;
    const angleInRadians = MathUtils.degToRad(angle);

    onInit();
    if (duration > 0 || delay > 0) {
      this._rotationTransition = new Tween({ zr: this._position.w })
        .to({ zr: angleInRadians }, duration * 1000)
        .easing(easing)
        .onStart(onStart)
        .onUpdate(({ zr }) => {
          this._position.set(this._position.x, this._position.y, this._position.z, zr);
          onUpdate();
        })
        .onComplete(onComplete)
        .onStop(onStop)
        .delay(delay * 1000)
        .start();
    } else {
      this._position.set(this._position.x, this._position.y, this._position.z, angleInRadians);
    }
  }

  /**
   * Moves the camera to a relative position on the background. Cancels any in-progress moves.
   * @param {CameraPosition | boolean} position - the position to move towards on each axis in relative units from 0 to 1.
   * If a boolean is passed in instead then the move will either continue or stop based on the value.
   * @param {TransitionConfig} transition - optional configuration for a transition.
   */
  move(position: CameraPosition | boolean, transition: TransitionConfig = {}): void {
    if (typeof position === 'boolean') {
      if (!position) {
        this._positionTransition.stop();
      }
      return;
    }

    this._positionTransition.stop();
    const { x: currentX, y: currentY, z: currentZ } = this._position;
    const { x = currentX, y = currentY, z = currentZ } = position;
    const {
      duration = 0,
      delay = 0,
      easing = Easing.Linear.None,
      onInit = () => ({}),
      onStart = () => ({}),
      onUpdate = () => ({}),
      onComplete = () => ({}),
      onStop = () => ({}),
    } = transition;

    onInit();
    if (duration > 0 || delay > 0) {
      this._positionTransition = new Tween({ x: currentX, y: currentY, z: currentZ })
        .to({ x, y, z }, duration * 1000)
        .easing(easing)
        .onStart(onStart)
        .onUpdate(({ x, y, z }) => {
          this._position.set(x, y, z, this._position.w);
          onUpdate();
        })
        .onComplete(onComplete)
        .onStop(onStop)
        .delay(delay * 1000)
        .start();
    } else {
      this._position.set(x, y, z, this._position.w);
    }
  }

  /**
   * Updates the camera position. Should be called on every render frame.
   */
  update(): void {
    // scale sway based on the current depth to provide a consistent distance regardless of depth
    const swayScale = this._positionWithOffset.z / getMaxFullScreenDepthForPlane(this._plane, this.camera, this.camera.rotation.z);

    this._positionWithOffset.set(
      clamp(this._position.x + this._positionOffset.x + this._swayOffset.x * swayScale, 0, 1),
      clamp(this._position.y + this._positionOffset.y + this._swayOffset.y * swayScale, 0, 1),
      clamp((this._position.z + this._positionOffset.z + this._swayOffset.z) * CameraZoomRange + (1.0 - CameraZoomRange), 0, 1),
      this._position.w + MathUtils.degToRad(this._positionOffset.w) + this._swayOffset.w,
    );

    const { x: absoluteX, y: absoluteY, z: absoluteDepth } = toAbsolutePosition(
      this._plane,
      this.camera,
      this._positionWithOffset,
    );

    this.camera.position.set(absoluteX, absoluteY, absoluteDepth);
    this.camera.rotation.z = this._position.w + MathUtils.degToRad(this._positionOffset.w) + this._swayOffset.w;
  }

  /**
   * Disposes this object. Call when this object is no longer needed, otherwise leaks may occur.
   */
  dispose(): void {
    this.sway(false);
    this.move(false);
    this.rotate(false);
  }
}

export {
  CameraPosition,
  CameraPositionWithRotation,
  CameraOffset,
  BackgroundCamera,
};

export default BackgroundCamera;

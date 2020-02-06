
import { PerspectiveCamera, Vector4, Math as MathUtils } from 'three';
import TWEEN from '@tweenjs/tween.js';
import { PlaneMesh } from './background';
import { BaseTransitionConfig } from './transition';

/**
 * Returns the visible height at the given depth in world units.
 * @param {number} absoluteZ - the depth in absolute world units.
 * @param {PerspectiveCamera} camera - a three.js PerspectiveCamera.
 * @returns number
 */
function getVisibleHeightAtDepth(absoluteZ: number, camera: PerspectiveCamera): number {
  // fov is vertical fov in radians
  return 2 * Math.tan(MathUtils.degToRad(camera.fov) / 2) * absoluteZ;
}

/**
 * Returns the visible width at the given depth in world units.
 * @param {number} absoluteZ - the depth in absolute world units.
 * @param {PerspectiveCamera} camera - a three.js PerspectiveCamera.
 * @returns number
 */
function getVisibleWidthAtDepth(absoluteZ: number, camera: PerspectiveCamera): number {
  return getVisibleHeightAtDepth(absoluteZ, camera) * camera.aspect;
}

/**
 * Adapted from https://stackoverflow.com/questions/16702966/rotate-image-and-crop-out-black-borders/16778797#16778797.
 *
 * Given a rectangle of size w x h that has been rotated by 'angle' (in
 * radians), computes and returns the width and height of the largest possible
 * axis-aligned rectangle (maximal area) within the rotated rectangle.
 * 
 * @param {number} width - the width of the rectangle.
 * @param {number} height - the height of the rectangle.
 * @param {number} angleInRadians - the angle to rotate in radians.
 * @returns Object - { width: number; height: number }
 */
function getInnerBoundedBoxForRect(width: number, height: number, angleInRadians = 0): { width: number; height: number } {
  const widthIsLonger = width >= height;
  const longSide = widthIsLonger ? width : height;
  const shortSide = widthIsLonger ? height : width;
  const sinAngle = Math.abs(Math.sin(angleInRadians));
  const cosAngle = Math.abs(Math.cos(angleInRadians));

  // since the solutions for angle, -angle and 180-angle are all the same,
  // it suffices to look at the first quadrant and the absolute values of sin,cos:
  if ((shortSide <= 2 * sinAngle * cosAngle * longSide) || (Math.abs(sinAngle - cosAngle) < 1e-10)) {
    // half constrained case: two crop corners touch the longer side,
    // the other two corners are on the mid-line parallel to the longer line
    const x = 0.5 * shortSide;
    return {
      width: widthIsLonger ? x / sinAngle : x / cosAngle,
      height: widthIsLonger ? x / cosAngle : x / sinAngle,
    };
  }

  // fully constrained case: crop touches all 4 sides
  const cosDoubleAngle = cosAngle * cosAngle - sinAngle * sinAngle;
  return {
    width: (width * cosAngle - height * sinAngle) / cosDoubleAngle,
    height: (height * cosAngle - width * sinAngle) / cosDoubleAngle,
  };
}

/**
 * Returns the maximum depth for a plane such that it is still fullscreen.
 * @param {PlaneMesh} plane - a three.js plane mesh.
 * @param {PerspectiveCamera} camera - a three.js PerspectiveCamera.
 * @param {number} rotateZ - the z-axis rotation angle of the camera in radians.
 * @returns number
 */
function getMaxFullScreenDepthForPlane(plane: PlaneMesh, camera: PerspectiveCamera, rotateZ: number): number {
  // When the camera is rotated, we treat the object as if it were rotated instead and
  // use the width/height of the maximal inner bounded box that fits within the object.
  // This ensures that the maximum depth calculated will always allow for the object to be
  // fullscreen even if rotated.
  // NOTE: if there is no rotation (i.e 0 degs) then the object's width and height will be used as normal.
  const { width: rectWidth, height: rectHeight } = plane.geometry.parameters;
  const { width, height } = getInnerBoundedBoxForRect(rectWidth, rectHeight, rotateZ);

  const verticalFovConstant = 2 * Math.tan(MathUtils.degToRad(camera.fov) / 2);
  const maxDepthForWidth = width / (verticalFovConstant * camera.aspect);
  const maxDepthForHeight = height / verticalFovConstant;

  // NOTE: this depth assumes the camera is centered on the object.
  return Math.min(maxDepthForWidth, maxDepthForHeight) + plane.position.z;
}

/**
 * Returns the visible width and height at the given depth in world units.
 * @param {PlaneMesh} plane - a three.js plane mesh.
 * @param {PerspectiveCamera} camera - a three.js PerspectiveCamera.
 * @param {number} relativeZ - value between 0 (max zoom-in) and 1 (max zoom-out) that represents the z position.
 * @param {number} rotateZ - the z-axis rotation angle of the camera in radians.
 * @returns Object - { width: number; height: number }
 */
function getViewBox(plane: PlaneMesh, camera: PerspectiveCamera, relativeZ: number, rotateZ: number): { width: number; height: number } {
  const maxDepth = getMaxFullScreenDepthForPlane(plane, camera, rotateZ);
  const absoluteDepth = relativeZ * maxDepth;
  return {
    width: getVisibleWidthAtDepth(absoluteDepth, camera),
    height: getVisibleHeightAtDepth(absoluteDepth, camera),
  };
}

/**
 * Returns the available x and y distance a camera can be panned at the given depth in world units.
 * @param {PlaneMesh} plane - a three.js plane mesh.
 * @param {PerspectiveCamera} camera - a three.js PerspectiveCamera.
 * @param {number} relativeZ - value between 0 (max zoom-in) and 1 (max zoom-out) that represents the z position.
 * @param {number} rotateZ - the z-axis rotation angle of the camera in radians.
 * @returns Object - { width: number, height: number }
 */
function getAvailablePanDistance(plane: PlaneMesh, camera: PerspectiveCamera, relativeZ: number, rotateZ: number) {
  const { width: rectWidth, height: rectHeight } = plane.geometry.parameters;
  const { width, height } = getInnerBoundedBoxForRect(rectWidth, rectHeight, rotateZ);
  const viewBox = getViewBox(plane, camera, relativeZ, rotateZ);
  return {
    width: width - viewBox.width,
    height: height - viewBox.height,
  };
}

/**
 * Converts a relative vector to an absolute vector for a given plane and camera.
 * @param {PlaneMesh} plane - a three.js plane mesh.
 * @param {PerspectiveCamera} camera - a three.js PerspectiveCamera.
 * @param {Vector4} relativePosition - a vector that represents the relative camera position to convert from.
 * The rotation component of the vector MUST be in units of radians.
 * @returns Vector4
 */
function toAbsolutePosition(plane: PlaneMesh, camera: PerspectiveCamera, relativePosition: Vector4): Vector4 {
  const { x, y, z, w: zr } = relativePosition;

  const panDistance = getAvailablePanDistance(plane, camera, z, zr);
  // offset the viewbox's position so that it starts at the top-left corner, then move it
  // based on the relative proportion to the available x and y distance the viewbox can be moved.
  const absoluteX = -(panDistance.width / 2) + (x * panDistance.width);
  const absoluteY = (panDistance.height / 2) - (y * panDistance.height);
  const absoluteDepth = getMaxFullScreenDepthForPlane(plane, camera, zr) * z;

  return new Vector4(
    // Make sure to rotate the x/y positions to get the actual correct positions relative to the camera rotation.
    absoluteX * Math.cos(zr) - absoluteY * Math.sin(zr),
    absoluteX * Math.sin(zr) + absoluteY * Math.cos(zr),
    absoluteDepth,
    zr,
  );
}

export interface CameraPosition {
  x?: number;
  y?: number;
  z?: number;
}

export interface CameraPositionWithRotation extends CameraPosition {
  zr?: number;
}

export type CameraOffset = CameraPositionWithRotation;
export type SwayTransitionConfig = BaseTransitionConfig;
export type MoveTransitionConfig = Omit<BaseTransitionConfig, 'loop'>;

class BackgroundCamera {
  private _plane: PlaneMesh;
  public readonly camera: PerspectiveCamera;

  // the relative position of the camera
  // NOTE: the w component is used as the z-axis rotation component of the vector (also aliased as zr)
  private readonly _position: Vector4 = new Vector4(0, 0, 1, 0);
  private readonly _positionWithOffset: Vector4 = this._position.clone();
  private _positionTransition: TWEEN.Tween = new TWEEN.Tween();
  private _rotationTransition: TWEEN.Tween = new TWEEN.Tween();

  // the relative offset against the position
  private readonly _swayOffset = new Vector4(0, 0, 0, 0);
  private _swayTransition: TWEEN.Tween = new TWEEN.Tween();

  /**
   * Constructs a BackgroundCamera using a Background's plane.
   * @param {PlaneMesh} plane - a three.js plane mesh representing the background.
   * @param {Number} width - the width of the camera.
   * @param {Number} height - the height of the camera.
   */
  constructor(plane: PlaneMesh, width: number, height: number) {
    this._plane = plane;
    this.camera = new PerspectiveCamera(35, width / height);
  }

  /**
   * Returns the current position of the camera.
   * @returns CameraPositionWithRotation
   */
  get position(): CameraPositionWithRotation {
    // NOTE: the relative camera position is the base position and does NOT include offsets (e.g sway).
    const { x, y, z, w: zr } = this._position;
    return { x, y, z, zr };
  }

  /**
   * Sets the size of the camera.
   * @param {number} width
   * @param {number} height
   */
  setSize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Sways the camera around its position.
   * @param {CameraOffset | boolean} offset - the offset to sway on each axis in relative units from 0 to 1.
   * The rotation offset (zr) must be specified in units of degrees.
   * The x/y offsets should be set based off a z of 1 and will be scaled down appropriately based on the camera's current z position.
   * If a boolean is passed in instead then the sway will either continue or stop based on the value.
   * @param {SwayTransitionConfig} transition - optional configuration for a transition.
   */
  sway(offset: CameraOffset | boolean, transition: SwayTransitionConfig = {}) {
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
      easing = TWEEN.Easing.Linear.None,
      onInit = () => ({}),
      onStart = () => ({}),
      onUpdate = () => ({}),
      onComplete = () => ({}),
      onStop = () => ({}),
    } = transition;

    const { x = 0, y = 0, z = 0, zr = 0 } = offset;
    const zrInRadians = MathUtils.degToRad(zr);

    // Relative distances result in shorter sways at high z-values (zoomed-out) and larger sways at low z-values (zoomed-in),
    // so dampen x/y sway based on the camera's current z position.
    const zDampen = this._position.z / getMaxFullScreenDepthForPlane(this._plane, this.camera, this.camera.rotation.z);

    onInit();
    this._swayTransition = new TWEEN.Tween({
      offsetX: this._swayOffset.x,
      offsetY: this._swayOffset.y,
      offsetZ: this._swayOffset.z,
      offsetZR: this._swayOffset.w,
    })
      .to({
        offsetX: -x + Math.random() * x * zDampen,
        offsetY: -y + Math.random() * y * zDampen,
        offsetZ: -z + Math.random() * z,
        offsetZR: -zrInRadians + Math.random() * zrInRadians,
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
   * Rotates the camera on its z-axis.
   * @param {number | boolean} angle - the angle to rotate in degrees.
   * If a boolean is passed in instead then the rotation will either continue or stop based on the value.
   * @param {MoveTransitionConfig} transition - optional configuration for a transition.
   */
  rotate(angle: number | boolean, transition: MoveTransitionConfig = {}) {
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
      easing = TWEEN.Easing.Linear.None,
      onInit = () => ({}),
      onStart = () => ({}),
      onUpdate = () => ({}),
      onComplete = () => ({}),
      onStop = () => ({}),
    } = transition;
    const angleInRadians = MathUtils.degToRad(angle);

    onInit();
    if (duration > 0 || delay > 0) {
      this._rotationTransition = new TWEEN.Tween({ zr: this._position.w })
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
   * Moves the camera to a relative position on the background.
   * @param {CameraPosition | boolean} position - the position to move towards on each axis in relative units from 0 to 1.
   * If a boolean is passed in instead then the move will either continue or stop based on the value.
   * @param {MoveTransitionConfig} transition - optional configuration for a transition.
   */
  move(position: CameraPosition | boolean, transition: MoveTransitionConfig = {}) {
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
      easing = TWEEN.Easing.Linear.None,
      onInit = () => ({}),
      onStart = () => ({}),
      onUpdate = () => ({}),
      onComplete = () => ({}),
      onStop = () => ({}),
    } = transition;

    onInit();
    if (duration > 0) {
      this._positionTransition = new TWEEN.Tween({ x: currentX, y: currentY, z: currentZ })
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
  update() {
    // Ensure that the position is always valid despite sway.
    // Moving the camera in-between ongoing sway cycles does not always guarantee the validity of the position, so coercion is required.
    this._positionWithOffset.set(
      Math.min(1, Math.max(0, this._position.x + this._swayOffset.x)),
      Math.min(1, Math.max(0, this._position.y + this._swayOffset.y)),
      Math.min(1, Math.max(0, this._position.z + this._swayOffset.z)),
      this._position.w + this._swayOffset.w,
    );
  
    const { x: absoluteX, y: absoluteY, z: absoluteDepth } = toAbsolutePosition(
      this._plane,
      this.camera,
      this._positionWithOffset,
    );

    this.camera.position.set(absoluteX, absoluteY, absoluteDepth);
    this.camera.rotation.z = this._position.w + this._swayOffset.w;
  }

  /**
   * Disposes this object. Call when this object is no longer needed, otherwise leaks may occur.
   */
  dispose() {
    this.sway(false);
    this.move(false);
    this.rotate(false);
  }
}

export {
  getMaxFullScreenDepthForPlane,
  BackgroundCamera,
};

export default BackgroundCamera;

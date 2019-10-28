
import { PerspectiveCamera, Vector3, Math as threeMath } from 'three';
import TWEEN from '@tweenjs/tween.js';

/**
 * Returns the visible width at the given depth in world units.
 * @param {Number} absoluteDepth - the depth in absolute world units.
 * @param {three.Camera} camera - a three.js camera.
 */
function getVisibleWidthAtDepth(absoluteDepth, camera) {
  return getVisibleHeighAtDepth(absoluteDepth, camera) * camera.aspect;
}

/**
 * Returns the visible height at the given depth in world units.
 * @param {Number} absoluteDepth - the depth in absolute world units.
 * @param {three.Camera} camera - a three.js camera.
 */
function getVisibleHeighAtDepth(absoluteDepth, camera) {
  // fov is vertical fov in radians
  return 2 * Math.tan((camera.fov * (Math.PI / 180)) / 2) * absoluteDepth;
}

/**
 * Returns the maximum depth for an object such that it is still fullscreen.
 * @param {three.Object3D} object - a three.js object.
 * @param {three.Camera} camera - a three.js camera.
 */
function getMaxFullScreenDepthForObject(object, camera) {
  const verticalFovConstant = 2 * Math.tan(threeMath.degToRad(camera.fov) / 2);
  const maxDepthForHeight = object.geometry.parameters.height / verticalFovConstant;
  const maxDepthForWidth = object.geometry.parameters.width / (verticalFovConstant * camera.aspect);

  // NOTE: this depth assumes the camera is centered on the object.
  return Math.min(maxDepthForWidth, maxDepthForHeight) + object.position.z;
}

/**
 * Returns the visible width and height at the given depth in world units.
 * @param {three.Object3D} object - a three.js object.
 * @param {three.Camera} camera - a three.js camera.
 * @param {Number} relativeZ - value between 0 (max zoom-in) and 1 (max zoom-out) that represents the z position.
 */
function getViewBox(object, camera, relativeZ) {
  const maxDepth = getMaxFullScreenDepthForObject(object, camera);
  const absoluteDepth = relativeZ * maxDepth;
  return {
    width: getVisibleWidthAtDepth(absoluteDepth, camera),
    height: getVisibleHeighAtDepth(absoluteDepth, camera),
  };
}

/**
 * Returns the available x and y distance a camera can be panned at the given depth in world units.
 * @param {three.Object3D} object - a three.js object.
 * @param {three.Camera} camera - a three.js camera.
 * @param {Number} relativeZ - value between 0 (max zoom-in) and 1 (max zoom-out) that represents the z position.
 */
function getAvailablePanDistance(object, camera, relativeZ) {
  const viewBox = getViewBox(object, camera, relativeZ);
  return {
    width: object.geometry.parameters.width - viewBox.width,
    height: object.geometry.parameters.height - viewBox.height,
  };
}

/**
 * Converts a relative vector to an absolute vector for a given object and camera.
 * @param {three.Object3D} object - a three.js object.
 * @param {three.Camera} camera - a three.js camera.
 * @param {Number} relativeX - a value between 0 and 1 that represents the z position.
 * @param {Number} relativeY - a value between 0 and 1 that represents the y position.
 * @param {Number} relativeZ - a value between 0 and 1 that represents the z position.
 */
function toAbsolutePosition(object, camera, relativeX, relativeY, relativeZ) {
  const panDistance = getAvailablePanDistance(object, camera, relativeZ);

  // offset the viewbox's position so that it starts at the top-left corner, then move it
  // based on the relative proportion to the available x and y distance the viewbox can be moved.
  const absoluteX = -(panDistance.width / 2) + (relativeX * panDistance.width);
  const absoluteY = (panDistance.height / 2) - (relativeY * panDistance.height);
  const absoluteDepth = getMaxFullScreenDepthForObject(object, camera) * relativeZ;
  return new Vector3(absoluteX, absoluteY, absoluteDepth);
}

/**
 * Converts an absolute vector to a relative vector for a given object and camera.
 * @param {three.Object3D} object - a three.js object.
 * @param {three.Camera} camera - a three.js camera.
 * @param {Number} absoluteX - an absolute x position in world units.
 * @param {Number} absoluteY - an absolute y position in world units.
 * @param {Number} absoluteZ - an absolute z position in world units.
 */
function toRelativePosition(object, camera, absoluteX, absoluteY, absoluteZ) {
  const relativeZ = absoluteZ / getMaxFullScreenDepthForObject(object, camera);
  const panDistance = getAvailablePanDistance(object, camera, relativeZ);
  const relativeX = (absoluteX / panDistance.width) + ((panDistance.width / 2) / panDistance.width);
  const relativeY = panDistance.height === 0 ? 0 : Math.abs((absoluteY / panDistance.height) - ((panDistance.height / 2) / panDistance.height));
  return new Vector3(relativeX, relativeY, relativeZ);
}

class BackgroundCamera {
  _object;
  _camera;
  _position; // the current relative position of the camera
  _moveTransition;

  _swayOffset = new Vector3(0, 0, 0); // the current relative vector offset to sway away from the camera
  _swayDistance = new Vector3(0, 0, 0);
  _swayCycleInSeconds;
  _swayTransition;

  constructor(background, width, height, fov = 35) {
    this._object = background.plane;
    this._camera = new PerspectiveCamera(fov, width / height);
    this._position = new Vector3(0, 0, 1);
  }

  get camera() {
    return this._camera;
  }

  get position() {
    const { x: absoluteX, y: absoluteY, z: absoluteZ } = this._camera.position;
    return {
      absolute: this._camera.position,
      relative: toRelativePosition(this._object, this._camera, absoluteX, absoluteY, absoluteZ),
    };
  }

  setSize(width, height) {
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
  }

  /**
   * Sways the camera around its current position repeatedly.
   * @param {three.Vector3} relativeDistance - the relative distances allowed on each axis for swaying.
   * @param {Number} cycleInSeconds - the length of a sway in seconds.
   */
  sway(relativeDistance, cycleInSeconds) {
    this._swayDistance = relativeDistance || this._swayDistance;
    this._swayCycleInSeconds = cycleInSeconds || this._swayCycleInSeconds;

    // TODO support rotations
    const swayMinX = Math.max(0, this._position.x - this._swayDistance.x);
    const swayMaxX = Math.min(1, this._position.x + this._swayDistance.x);
    const swayX = Math.random() * (swayMaxX - swayMinX) + swayMinX;
    const swayMinY = Math.max(0, this._position.y - this._swayDistance.y);
    const swayMaxY = Math.min(1, this._position.y + this._swayDistance.y);
    const swayY = Math.random() * (swayMaxY - swayMinY) + swayMinY;
    const swayMinZ = Math.max(0, this._position.z - this._swayDistance.z);
    const swayMaxZ = Math.min(1, this._position.z + this._swayDistance.z);
    const swayZ = Math.random() * (swayMaxZ - swayMinZ) + swayMinZ;

    this._swayTransition = new TWEEN.Tween({
      offsetX: this._swayOffset.x,
      offsetY: this._swayOffset.y,
      offsetZ: this._swayOffset.z,
    })
      .to({
        offsetX: swayX - this._position.x,
        offsetY: swayY - this._position.y,
        offsetZ: swayZ - this._position.z,
      }, this._swayCycleInSeconds * 1000)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .onStart(() => {
        // console.log('sway start');
      })
      .onUpdate(({ offsetX, offsetY, offsetZ }) => {
        this._swayOffset = new Vector3(offsetX, offsetY, offsetZ);
      })
      .onComplete(() => {
        // console.log('sway end');
        this._swayTransition = null;
      })
      .start();
  }

  /**
   * Moves the camera to a relative position on the background.
   * @param {Number} relativeX - value between 0 and 1 that represents the x position based on the relativeZ.
   * @param {Number} relativeY - value between 0 and 1 that represents the y position based on the relativeZ.
   * @param {Number} relativeZ - value between 0 (max zoom-in) and 1 (max zoom-out) that represents the z position.
   */
  // TODO accept a transition as params
  move(relativeX, relativeY, relativeZ) {
    this._moveTransition = new TWEEN.Tween({ x: this._position.x, y: this._position.y, z: this._position.z })
      .to({ x: relativeX, y: relativeY, z: relativeZ }, 1000)
      .easing(TWEEN.Easing.Quartic.Out)
      .onStart(() => {
        // console.log('move start');
      })
      .onUpdate(({ x, y, z }) => {
        this._position = new Vector3(x, y, z);
      })
      .onComplete(() => {
        // console.log('move end');
        this._moveTransition = null;
      })
      .start();
  }

  /**
   * Updates the camera position. Should be called on every render frame.
   */
  update() {
    if (!this._swayTransition) {
      // TODO check boolean to allow disabling sway
      this.sway();
    }

    const { x: absoluteX, y: absoluteY, z: absoluteDepth } = toAbsolutePosition(
      this._object,
      this._camera,
      // Ensure that the position is always valid despite sway
      // TODO moving the camera in-between sway cycles does not guarantee the validity of the position, so coercion is requried
      Math.min(1, Math.max(0, this._position.x + this._swayOffset.x)),
      Math.min(1, Math.max(0, this._position.y + this._swayOffset.y)),
      Math.min(1, Math.max(0, this._position.z + this._swayOffset.z)),
    );
    this._camera.position.set(absoluteX, absoluteY, absoluteDepth);
    this._camera.updateProjectionMatrix();
  }
}

export default BackgroundCamera;

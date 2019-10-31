
import { PerspectiveCamera, Vector3, Math as threeMath } from 'three';
import TWEEN from '@tweenjs/tween.js';

/**
 * Returns the visible width at the given depth in world units.
 * @param {Number} absoluteZ - the depth in absolute world units.
 * @param {three.Camera} camera - a three.js camera.
 */
function getVisibleWidthAtDepth(absoluteZ, camera) {
  return getVisibleHeightAtDepth(absoluteZ, camera) * camera.aspect;
}

/**
 * Returns the visible height at the given depth in world units.
 * @param {Number} absoluteZ - the depth in absolute world units.
 * @param {three.Camera} camera - a three.js camera.
 */
function getVisibleHeightAtDepth(absoluteZ, camera) {
  // fov is vertical fov in radians
  return 2 * Math.tan(threeMath.degToRad(camera.fov) / 2) * absoluteZ;
}

/**
 * Returns the maximum depth for an object such that it is still fullscreen.
 * @param {three.Object3D} object - a three.js object.
 * @param {three.Camera} camera - a three.js camera.
 */
function getMaxFullScreenDepthForObject(object, camera, cameraRotateZ = 15) {
  // When the camera is rotated, we treat the object as if it were rotated instead and
  // use the width/height of the maximal inner bounded box that fits within the object.
  // This ensures that the maximum depth calculated will always allow for the object to be
  // fullscreen even if rotated.
  // NOTE: if there is no rotation (i.e 0 degs) then the object's width and height will be used as normal.
  const { width, height } = getInnerBoundedBoxForRotation(object, cameraRotateZ);

  const verticalFovConstant = 2 * Math.tan(threeMath.degToRad(camera.fov) / 2);
  const maxDepthForHeight = width / verticalFovConstant;
  const maxDepthForWidth = height / (verticalFovConstant * camera.aspect);


  // NOTE: this depth assumes the camera is centered on the object.
  return Math.min(maxDepthForWidth, maxDepthForHeight) + object.position.z;
}
/**
 * Adapted from https://stackoverflow.com/questions/16702966/rotate-image-and-crop-out-black-borders/16778797#16778797.
 *
 * Given a rectangle of size w x h that has been rotated by 'angle' (in
 * degrees), computes the width and height of the largest possible
 * axis-aligned rectangle (maximal area) within the rotated rectangle.
 * @param {three.Object3D} object - a three.js object.
 * @param {number} angleInDegrees - the angle to rotate in degrees.
 */
function getInnerBoundedBoxForRotation(object, angleInDegrees) {
  const angleInRadians = threeMath.degToRad(angleInDegrees);
  const { width, height } = object.geometry.parameters;
  const widthIsLonger = width > height;
  const longSide = widthIsLonger ? width : height;
  const shortSide = widthIsLonger ? height : width;
  const sinAngle = Math.abs(Math.sin(angleInRadians));
  const cosAngle = Math.abs(Math.cos(angleInRadians));

  // half constrained case: two crop corners touch the longer side,
  // the other two corners are on the mid-line parallel to the longer line
  if ((shortSide <= 2 * sinAngle * cosAngle * longSide) || (Math.abs(Math.sin(angleInRadians) - Math.cos(angleInRadians)) < 1e-10)) {
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
    height: getVisibleHeightAtDepth(absoluteDepth, camera),
  };
}

/**
 * Returns the available x and y distance a camera can be panned at the given depth in world units.
 * @param {three.Object3D} object - a three.js object.
 * @param {three.Camera} camera - a three.js camera.
 * @param {Number} relativeZ - value between 0 (max zoom-in) and 1 (max zoom-out) that represents the z position.
 */
function getAvailablePanDistance(object, camera, relativeZ) {
  // TODO: need to use transformed object width/height that factors in rotation
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
    this._camera.rotateZ(threeMath.degToRad(15));
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
   * The x/y distances should be set based off a z-value of 1 and will be scaled down appropriately based on the camera's current z position.
   * @param {Number} cycleInSeconds - the length of a sway in seconds.
   */
  sway(relativeDistance, cycleInSeconds) {
    this._swayDistance = relativeDistance || this._swayDistance;
    this._swayCycleInSeconds = cycleInSeconds || this._swayCycleInSeconds;

    // Relative distances result in shorter sways at high z-values (zoomed-out) and larger sways at low z-values (zoomed-in),
    // so dampen x/y sway based on the camera's current z position.
    const dampeningFactor = this._position.z / 2;

    // TODO support rotations
    const swayMinX = Math.max(0, this._position.x - (this._swayDistance.x * dampeningFactor));
    const swayMaxX = Math.min(1, this._position.x + (this._swayDistance.x * dampeningFactor));
    const swayX = Math.random() * (swayMaxX - swayMinX) + swayMinX;
    const swayMinY = Math.max(0, this._position.y - (this._swayDistance.y * dampeningFactor));
    const swayMaxY = Math.min(1, this._position.y + (this._swayDistance.y * dampeningFactor));
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
      .easing(TWEEN.Easing.Quadratic.InOut)
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

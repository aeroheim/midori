
import * as three from 'three';
import { Vector3 } from 'three';

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
  const verticalFovConstant = 2 * Math.tan(three.Math.degToRad(camera.fov) / 2);
  const maxDepthForHeight = object.geometry.parameters.height / verticalFovConstant;
  const maxDepthForWidth = object.geometry.parameters.width / (verticalFovConstant * camera.aspect);

  // NOTE: this depth assumes the camera is centered on the object.
  return Math.min(maxDepthForWidth, maxDepthForHeight) + object.position.z;
}

/**
 * Returns the visible width and height at the given depth in world units.
 * @param {three.Object3D} object - a three.js object.
 * @param {three.Camera} camera - a three.js camera.
 * @param {Number} relativeDepth - value between 0 (max zoom-in) and 1 (max zoom-out) that represents the z position.
 */
function getViewBox(object, camera, relativeDepth) {
  const maxDepth = getMaxFullScreenDepthForObject(object, camera);
  const absoluteDepth = relativeDepth * maxDepth;
  return {
    width: getVisibleWidthAtDepth(absoluteDepth, camera),
    height: getVisibleHeighAtDepth(absoluteDepth, camera),
  };
}

/**
 * Returns the available x and y distance a camera can be panned at the given depth in world units.
 * @param {three.Object3D} object - a three.js object.
 * @param {three.Camera} camera - a three.js camera.
 * @param {Number} relativeDepth - value between 0 (max zoom-in) and 1 (max zoom-out) that represents the z position.
 */
function getAvailablePanDistance(object, camera, relativeDepth) {
  const viewBox = getViewBox(object, camera, relativeDepth);
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
 * @param {Number} relativeDepth - a value between 0 and 1 that represents the z position.
 */
function toAbsolutePosition(object, camera, relativeX, relativeY, relativeDepth) {
  const panDistance = getAvailablePanDistance(object, camera, relativeDepth);
  const absoluteX = -(panDistance.width / 2) + (relativeX * panDistance.width);
  const absoluteY = (panDistance.height / 2) - (relativeY * panDistance.height);
  const absoluteDepth = getMaxFullScreenDepthForObject(object, camera) * relativeDepth;
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
function toRelativePosition(object, camera, absoluteX, absoluteY, absoluteDepth) {
  const relativeDepth = absoluteDepth / getMaxFullScreenDepthForObject(object, camera);
  const panDistance = getAvailablePanDistance(object, camera, relativeDepth);
  const relativeX = (absoluteX / panDistance.width) + ((panDistance.width / 2) / panDistance.width);
  const relativeY = panDistance.height === 0 ? 0 : Math.abs((absoluteY / panDistance.height) - ((panDistance.height / 2) / panDistance.height));
  return new Vector3(relativeX, relativeY, relativeDepth);
}

class BackgroundCamera {
  _object;
  _camera;

  constructor(background, width, height, fov = 35) {
    this._object = background.plane;
    this._camera = new three.PerspectiveCamera(fov, width / height);
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
   * Updates the camera position. Should be called on every render frame.
   */
  updateCamera() {
    // TODO implement shake
    return this;
  }

  /**
   * Moves the camera to a relative position on the background.
   * @param {Number} relativeX - value between 0 and 1 that represents the x position based on the relativeDepth.
   * @param {Number} relativeY - value between 0 and 1 that represents the y position based on the relativeDepth.
   * @param {Number} relativeDepth - value between 0 (max zoom-in) and 1 (max zoom-out) that represents the z position.
   */
  move(relativeX, relativeY, relativeDepth) {
    // offset the viewbox's position so that it starts at the top-left corner, then move it
    // based on the relative proportion to the available x and y distance the viewbox can be moved.
    const { x: absoluteX, y: absoluteY, z: absoluteDepth } = toAbsolutePosition(this._object, this._camera, relativeX, relativeY, relativeDepth);
    this._camera.position.set(absoluteX, absoluteY, absoluteDepth);
    this._camera.updateProjectionMatrix();
  }
}

export default BackgroundCamera;

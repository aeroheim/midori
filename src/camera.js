
import * as three from 'three';

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

class Camera {
  _camera;

  constructor(width, height, fov = 35) {
    this._camera = new three.PerspectiveCamera(fov, width / height);
  }

  getThreeCamera() {
    return this._camera;
  }

  setSize(width, height) {
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
  }

  /**
   * Moves the camera to a relative position on a given object.
   * @param {three.Object3D} object - a three.js object
   * @param {Number} relativeX - value between 0 and 1 that represents the x position based on the relativeDepth.
   * @param {Number} relativeY - value between 0 and 1 that represents the y position based on the relativeDepth.
   * @param {Number} relativeDepth - value between 0 (max zoom-in) and 1 (max zoom-out) that represents the z position.
   */
  move(object, relativeX, relativeY, relativeDepth) {
    const panDistance = getAvailablePanDistance(object, this._camera, relativeDepth);
    const absoluteDepth = getMaxFullScreenDepthForObject(object, this._camera) * relativeDepth;

    // offset the viewbox's position so that it starts at the top-left corner, then move it
    // based on the relative proportion to the available x and y distance the viewbox can be moved.
    const absoluteX = -(panDistance.width / 2) + (relativeX * panDistance.width);
    const absoluteY = (panDistance.height / 2) - (relativeY * panDistance.height);
    this._camera.position.set(absoluteX, absoluteY, absoluteDepth);
    this._camera.updateProjectionMatrix();
  }
}

export default Camera;

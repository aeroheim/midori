import { PerspectiveCamera, MathUtils, Vector4 } from 'three';
import { PlaneMesh } from './background';

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

export {
  getMaxFullScreenDepthForPlane,
  toAbsolutePosition,
}
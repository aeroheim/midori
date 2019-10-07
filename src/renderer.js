import * as three from 'three';
import * as OrbitControls from 'three-orbit-controls'; // three.js OrbitControls export is broken; have to use a separate npm package of it ¯\_(ツ)_/¯

// TODO: parallax??
// possible to mimic parallax effect
// while panning out and transitioning, adjust z position of object being panned away from for "parallax" effect
// TODO: layers??
// can z-indices become implementation details of layers?

// TODO: use typescript and add some basic types
// TODO: accept optional easing/physics function for animation

const OrbitControl = OrbitControls.default(three);

function getMaxDepthForObject(object, camera) {
  const verticalFovConstant = 2 * Math.tan(three.Math.degToRad(camera.fov) / 2);
  const maxDepthForHeight = object.geometry.parameters.height / verticalFovConstant;
  const maxDepthForWidth = object.geometry.parameters.width / (verticalFovConstant * camera.aspect);

  // NOTE: this depth assumes the camera is centered on the object
  return Math.min(maxDepthForWidth, maxDepthForHeight) + object.position.z;
}

function getMaxHeightAtDepth(absoluteDepth, camera) {
  // fov is vertical fov in radians
  return 2 * Math.tan((camera.fov * (Math.PI / 180)) / 2) * absoluteDepth;
}

function getMaxWidthAtDepth(absoluteDepth, camera) {
  return getMaxHeightAtDepth(absoluteDepth, camera) * camera.aspect;
}

function getViewBox(object, camera, relativeDepth) {
  const maxDepth = getMaxDepthForObject(object, camera);
  const absoluteDepth = relativeDepth * maxDepth;
  return {
    width: getMaxWidthAtDepth(absoluteDepth, camera),
    height: getMaxHeightAtDepth(absoluteDepth, camera),
  };
}

function getAvailableDistance(object, camera, relativeDepth) {
  const viewBox = getViewBox(object, camera, relativeDepth);
  return {
    width: object.geometry.parameters.width - viewBox.width,
    height: object.geometry.parameters.height - viewBox.height,
  };
}

function move(object, camera, relativeX, relativeY, relativeDepth) {
  const distance = getAvailableDistance(object, camera, relativeDepth);
  const absoluteDepth = getMaxDepthForObject(object, camera) * relativeDepth;

  // offset the viewbox's position so that it starts at the top-left corner, then move it
  // based on the relative proportion to the available x and y distance the viewbox can be moved.
  const absoluteX = -(distance.width / 2) + (relativeX * distance.width);
  const absoluteY = (distance.height / 2) - (relativeY * distance.height);
  camera.position.set(absoluteX, absoluteY, absoluteDepth);
}

class Renderer {
  scene;
  camera;
  controls;
  renderer;
  parentDomElement;

  constructor(domElement) {
    this.renderer = new three.WebGLRenderer();
    this.renderer.domElement.id = 'midori';

    this.parentDomElement = domElement;
    this.parentDomElement.appendChild(this.renderer.domElement);

    this.scene = new three.Scene();
    this.camera = new three.PerspectiveCamera(35, domElement.clientWidth / domElement.clientHeight);
    this.camera.position.set(0, 0, 100);

    // eslint-disable-next-line no-unused-vars
    this.controls = new OrbitControl(this.camera);

    // TODO: scene-specific camera - probably not necessary?
    // this.scene.add(new three.AmbientLight(0xffffff));
    // this.scene.add(this.camera);
    // this.scene.add(new three.AxisHelper(1000));

    this.resize();
    window.onresize = this.resize;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    this.renderer.setSize(this.parentDomElement.clientWidth, this.parentDomElement.clientHeight);
    this.camera.aspect = this.parentDomElement.clientWidth / this.parentDomElement.clientHeight;

    // must call this each time after updating camera
    this.camera.updateProjectionMatrix();
  }

  setImage(texture) {
    const aspectRatio = texture.image.width / texture.image.height;

    const plane = new three.Mesh(
      new three.PlaneGeometry(1, 1 / aspectRatio),
      new three.MeshBasicMaterial({ map: texture }),
    );

    plane.add(new three.AxesHelper(1)); // TODO: eventually remove this
    this.scene.add(plane);

    move(plane, this.camera, 0, 0, 1);
    this.camera.updateProjectionMatrix();
  }
}

/**
 * Loads an image as a texture.
 * @async
 * @param {string} path - path to the image file.
 * @return {Promise} - texture on success, error on failure.
 */
function loadImage(path) {
  return new Promise((resolve, reject) => {
    new three.TextureLoader().load(path, (texture) => {
      // image should never wrap
      texture.wrapS = three.ClampToEdgeWrapping;
      texture.wrapT = three.ClampToEdgeWrapping;

      // image should be able to be UV mapped directly
      texture.minFilter = three.LinearFilter;

      // image should never repeat
      texture.repeat.set(1, 1);

      resolve(texture);
    },
    () => {},
    errorEvent => reject(errorEvent.error));
  });
}

export { Renderer, loadImage };

import * as three from 'three';
import Camera from './camera';
import Background from './background';

class Renderer {
  _renderer;
  _domElement;

  _background; // need a default background scene when nothing is loaded
  _transitionBackground;

  _camera;
  _transitionCamera;
  // _transition?

  constructor(domElement) {
    this._renderer = new three.WebGLRenderer();
    this._renderer.domElement.id = 'midori';
    this._domElement = domElement;
    this._domElement.appendChild(this._renderer.domElement);

    this._background = new Background();
    this._camera = new Camera(domElement.clientWidth, domElement.clientHeight);
    this._transitionBackground = new Background();
    this._transitionCamera = new Camera(domElement.clientWidth, domElement.clientHeight);

    this._renderer.setSize(this._domElement.clientWidth, this._domElement.clientHeight);
    this.resize = this.resize.bind(this);
    window.onresize = this.resize;
  }

  resize() {
    this._renderer.setSize(this._domElement.clientWidth, this._domElement.clientHeight);
    this._camera.resize(this._domElement.clientWidth, this._domElement.clientHeight);
    this._transitionCamera.resize(this._domElement.clientWidth, this._domElement.clientHeight);
  }

  // TODO
  // need to add support for background transitions
  setBackground(background) {
    this._background = background;
    const object = this._background.getThreeObject();
    if (object) {
      this._camera.move(object, 0, 0, 1);
    }
  }

  /*
  animate(effect, options) {

  }
  */

  // TODO
  // eventually there should be an fx scene as well
  // maybe other scenes as well when necessary?
  render() {
    this._renderer.render(this._background.getThreeScene(), this._camera.getThreeCamera());
  }
}

export default Renderer;

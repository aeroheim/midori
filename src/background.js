import * as three from 'three';

class Background {
  _scene;
  _plane;

  constructor(texture = null) {
    this._scene = new three.Scene();
    if (texture) {
      const aspectRatio = texture.image.width / texture.image.height;
      this._plane = new three.Mesh(
        new three.PlaneGeometry(1, 1 / aspectRatio),
        new three.MeshBasicMaterial({ map: texture }),
      );
      this._scene.add(this._plane);
    }
  }

  getThreeObject() {
    return this._plane;
  }

  getThreeScene() {
    return this._scene;
  }

  /**
 * Loads an image as a background.
 * @async
 * @param {string} path - path to the image file.
 * @return {Promise} - background on success, error on failure.
 */
  static async loadBackground(path) {
    return new Promise((resolve, reject) => {
      new three.TextureLoader().load(path, (texture) => {
        // image should never wrap
        texture.wrapS = three.ClampToEdgeWrapping;
        texture.wrapT = three.ClampToEdgeWrapping;

        // image should be able to be UV mapped directly
        texture.minFilter = three.LinearFilter;

        // image should never repeat
        texture.repeat.set(1, 1);

        resolve(new Background(texture));
      },
      () => {},
      errorEvent => reject(errorEvent.error));
    });
  }
}

export default Background;

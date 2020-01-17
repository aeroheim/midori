import { BufferGeometry, Float32BufferAttribute, Points, Color } from 'three';
import { ShaderUtils } from './postprocessing/shaders/shader-utils';
import ParticleShader from './postprocessing/shaders/particle-shader';

class Particles {
  _width;
  _height;
  _maxDepth;

  // TODO: document
  _particleGroups = {};
  _particles;

  // TODO: make sure setSize doesn't fuck up maxDepth
  constructor(width, height, maxDepth) {
    this._width = width;
    this._height = height;
    this._maxDepth = maxDepth;

    this._particles = new Points(
      new BufferGeometry(),
      ShaderUtils.createShaderMaterial(ParticleShader),
    );
  }

  /**
   * Generates particles based on a given set of configurations.
   * @param {Object || Array} config - a particle group configuration or array of particle group configurations.
   * @param {String} config.name - the name of the particle group.
   * @param {Number} config.amount - the number of particles to generate.
   * @param {Number} config.size=0 - the size of the particles in world units.
   * @param {Number} config.diameter=1 - optional diameter of the particles in relative units (0 to 1). Defaults to 1.
   * @param {Number} config.gradient=1 - optional fade gradient of the particles in relative units (0 to 1). Defaults to 1.
   * @param {Number} config.opacity=1 - optional opacity of the particles. Defaults to 1.
   * @param {Three.Color} config.color=0xffffff - optional color of the particles. Defaults to 0xffffff.
   */
  particles(configs) {
    configs = Array.isArray(configs) ? configs : [configs];

    // cleanup previous configs and objects
    this._particleGroups = {};
    this._particles.geometry.dispose();
    this._particles.material.dispose();

    const verticesArr = []; const sizeArr = []; const diameterArr = []; const gradientArr = []; const opacityArr = []; const colorArr = [];
    let index = 0;
    for (const config of configs) {
      const {
        name,
        amount = 0,
        size = 0,
        diameter = 1,
        gradient = 1,
        opacity = 1,
        color = new Color(0xffffff),
      } = config;

      for (let i = 0; i < amount || 0; ++i) {
        const x = (-this._width / 2) + this._width * Math.random();
        const y = (-this._height / 2) + this._height * Math.random();
        const z = (this._maxDepth / 4) * Math.random();

        verticesArr.push(x, y, z);
        sizeArr.push(size);
        diameterArr.push(diameter);
        gradientArr.push(gradient);
        opacityArr.push(opacity);
        colorArr.push(color.r, color.g, color.b);
      }

      this._particleGroups[name] = {
        name,
        index,
        amount,
        size,
        diameter,
        gradient,
        opacity,
        color,
      };

      index += amount;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(verticesArr, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(sizeArr, 1));
    geometry.setAttribute('diameter', new Float32BufferAttribute(diameterArr, 1));
    geometry.setAttribute('gradient', new Float32BufferAttribute(gradientArr, 1));
    geometry.setAttribute('opacity', new Float32BufferAttribute(opacityArr, 1));
    geometry.setAttribute('color', new Float32BufferAttribute(colorArr, 3));

    const material = ShaderUtils.createShaderMaterial(ParticleShader);
    material.transparent = true;
    this._particles.geometry = geometry;
    this._particles.material = material;
  }
  /**
   * Moves a group or multiple groups of particles.
   * @param {Object || Array} configs - a move configuration or array of move configurations.
   * @param {Number} config.x - the x offset to move.
   * @param {Number} config.y - the y offset to move.
   * @param {Object} config.transition={} - an optional transition configuration.
   */
  move(configs) {
    configs = Array.isArray(configs) ? configs : [configs];

    for (const config of configs) {
      const group = this._particles[config.name];
    }
  }

  // TODO: generic function that allows looped tweens of particle attributes (e.g opacity, gradient, size)
  // cycle()

  // sway()

  // update()

  /**
   * Returns a three.js object containing the particles.
   * To use the particles, add this object into a three.js scene.
   */
  get object() {
    return this._particles;
  }

  dispose() {
    this._particles.geometry.dispose();
    this._particles.material.dispose();
  }
}

export {
  Particles,
};

export default Particles;

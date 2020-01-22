import { BufferGeometry, Float32BufferAttribute, Points, Color, Vector2, Vector3 } from 'three';
import TWEEN from '@tweenjs/tween.js';
import { ParticleShader } from './postprocessing/shaders/particle-shader';
import { ShaderUtils } from './postprocessing/shaders/shader-utils';

class Particles {
  _width;
  _height;
  _maxDepth;

  // TODO: document
  // groups also store the transitions related to the attributes and offsets
  _groups = {};
  _particles;

  _positions = [];

  _sizes = [];
  _gradients = [];
  _opacities = [];
  _colors = [];

  // TODO: make sure setSize doesn't fuck up maxDepth
  constructor(width, height, maxDepth) {
    this._width = width;
    this._height = height;
    this._maxDepth = maxDepth;

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this._positions, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(this._sizes, 1));
    geometry.setAttribute('gradient', new Float32BufferAttribute(this._gradients, 1));
    geometry.setAttribute('opacity', new Float32BufferAttribute(this._opacities, 1));
    geometry.setAttribute('color', new Float32BufferAttribute(this._colors, 3));

    this._particles = new Points(
      geometry,
      ShaderUtils.createShaderMaterial(ParticleShader),
    );
  }

  /**
   * Generates particles based on a given set of configurations.
   * @param {Object || Array} config - a particle group configuration or array of particle group configurations.
   * @param {String} config.name - the name of the particle group.
   * @param {Number} config.amount - the number of particles to generate.
   * @param {Number} config.size=0 - the size of the particles in world units.
   * @param {Number} config.gradient=1 - optional fade gradient of the particles in relative units (0 to 1). Defaults to 1.
   * @param {Number} config.opacity=1 - optional opacity of the particles. Defaults to 1.
   * @param {Three.Color} config.color=0xffffff - optional color of the particles. Defaults to 0xffffff.
   */
  generate(configs) {
    configs = Array.isArray(configs) ? configs : [configs];

    // cleanup previous configs and objects
    this._positions = [];
    this._sizes = [];
    this._gradients = [];
    this._opacities = [];
    this._colors = [];
    this._groups = {};
    this._particles.geometry.dispose();
    this._particles.material.dispose();

    let index = 0;
    for (const config of configs) {
      const {
        name,
        amount = 0,
        size = 0,
        gradient = 1,
        opacity = 1,
        color = new Color(0xffffff),
      } = config;

      // Generate points with attributes
      for (let i = 0; i < amount || 0; ++i) {
        const x = (-this._width / 2) + this._width * Math.random();
        const y = (-this._height / 2) + this._height * Math.random();
        const z = (this._maxDepth / 4) * Math.random();
        this._positions.push(x, y, z);
        this._sizes.push(size);
        this._gradients.push(gradient);
        this._opacities.push(opacity);
        this._colors.push(color.r, color.g, color.b);
      }

      // Initialize group with respective and default properties
      this._groups[name] = {
        name,
        index,
        amount,
        size,
        gradient,
        opacity,
        color,
        swayOffset: new Vector2(0, 0),
      };

      index += amount;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this._positions, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(this._sizes, 1));
    geometry.setAttribute('gradient', new Float32BufferAttribute(this._gradients, 1));
    geometry.setAttribute('opacity', new Float32BufferAttribute(this._opacities, 1));
    geometry.setAttribute('color', new Float32BufferAttribute(this._colors, 3));

    const material = ShaderUtils.createShaderMaterial(ParticleShader);
    material.transparent = true;

    this._particles.geometry = geometry;
    this._particles.material = material;
  }

  /**
   * Calculates a new position based off an existing position and optional offset. Will wrap around boundaries.
   * @param {three.Vector2} position - the current position.
   * @param {three.Vector2} offset - the offset from the current position.
   */
  _getNewPosition(position, offset) {
    let { x: offsetX, y: offsetY } = offset || new Vector2(0, 0);
    offsetX %= this._width;
    offsetY %= this._height;

    let x = position.x + offsetX;
    let y = position.y + offsetY;
    const halfWidth = this._width / 2;
    const halfHeight = this._height / 2;

    // wrap around left/right
    if (Math.abs(position.x + offsetX) > halfWidth) {
      x = offsetX > 0
        ? -halfWidth + (((position.x + offsetX) - halfWidth) % this._width)
        : halfWidth - ((Math.abs(position.x + offsetX) - halfWidth) % this._width);
    }

    // wrap around top/bottom
    if (Math.abs(position.y + offsetY) > halfHeight) {
      y = offsetY > 0
        ? -halfHeight + (((position.y + offsetY) - halfHeight) % this._height)
        : halfHeight - ((Math.abs(position.y + offsetY) - halfHeight) % this._height);
    }

    return { x, y };
  }

  /**
   * Updates the internal positions for particles. This does NOT update the attributes of the BufferGeometry.
   * @param {Number} index - the index to start at.
   * @param {Number} amount - the number of particles.
   * @param {Array} positions - an array containing the position values to use.
   * @param {three.Vector2} offset - an optional offset to apply to all new position values.
   */
  _updatePositions(index, amount, positions, offset) {
    // Each vertex position is a set of 3 values, so index and amount are adjusted accordingly when iterating.
    for (let i = index; i < index + amount; ++i) {
      const { x, y } = this._getNewPosition(new Vector2(positions[i * 3], positions[i * 3 + 1]), offset);
      this._positions[i * 3] = x;
      this._positions[i * 3 + 1] = y;
    }
  }

  /**
   * Moves a group of particles.
   * @param {String} name - the name of the group to move.
   * @param {three.Vector2} offset - the distance and angle in radians to move.
   * @param {Object} transition={} - an optional transition configuration.
   * @param {Number} transition.loop=true - move repeatedly in a loop.
   * @param {Number} transition.duration=0 - the duration of the sway in seconds.
   * @param {TWEEN.Easing} transition.easing=TWEEN.Easing.Linear.None - the easing function to use.
   */
  move(name, offset, transition) {
    const group = this._groups[name];
    const { index, amount } = group;

    // Stop ongoing position transition for group.
    if (group.positionTransition) {
      group.positionTransition.stop();
    }

    const {
      loop = false,
      duration = 0,
      easing = TWEEN.Easing.Linear.None,
      onStart = () => ({}),
      onUpdate = () => ({}),
      onComplete = () => ({}),
      onStop = () => ({}),
    } = transition;

    const { x: distance, y: angle } = offset;
    const offsetX = distance * Math.cos(angle);
    const offsetY = distance * Math.sin(angle);
    if (duration > 0) {
      // Each vertex position is a set of 3 values, so adjust index and amount accordingly.
      const startPositions = this._positions.slice();
      group.positionTransition = new TWEEN.Tween({ offsetX: 0, offsetY: 0 })
        .to({ offsetX, offsetY }, duration * 1000)
        .easing(easing)
        .onStart(onStart)
        .onUpdate(({ offsetX, offsetY }) => {
          this._updatePositions(index, amount, startPositions, new Vector2(offsetX, offsetY));
          onUpdate();
        })
        .onComplete(() => {
          if (loop) {
            // Repeat move with same config.
            this.move(name, offset, transition);
          }
          onComplete();
        })
        .onStop(onStop)
        .start();
    } else {
      this._updatePositions(index, amount, this._positions, offset);
    }
  }

  // TODO: generic function that allows looped tweens of particle attributes (e.g position, opacity, gradient, size)
  // offset()

  /**
   * Sways a group of particles around repeatedly.
   * @param {String} name - the name of the group to sway.
   * @param {three.Vector2} distance - the distances in world units allowed on each axis for swaying.
   * @param {Object} transition - optional configuration for a transition.
   * @param {Number} transition.loop=true - sway repeatedly in a loop.
   * @param {Number} transition.duration=0 - the duration of the sway in seconds.
   * @param {TWEEN.Easing} transition.easing=TWEEN.Easing.Linear.None - the easing function to use.
   */
  sway(name, distance, transition = {}) {
    const group = this._groups[name];
    const { swayOffset } = group;

    // Stop ongoing sway transition for group.
    if (group.swayTransition) {
      group.swayTransition.stop();
    }

    const {
      loop = true,
      duration = 0,
      easing = TWEEN.Easing.Linear.None,
      onStart = () => ({}),
      onUpdate = () => ({}),
      onComplete = () => ({}),
      onStop = () => ({}),
    } = transition;

    const { x, y } = distance;
    group.swayTransition = new TWEEN.Tween({
      offsetX: swayOffset.x,
      offsetY: swayOffset.y,
    })
      .to({
        offsetX: -x + Math.random() * x,
        offsetY: -y + Math.random() * y,
      }, duration * 1000)
      .easing(easing)
      .onStart(onStart)
      .onUpdate(({ offsetX, offsetY }) => {
        swayOffset.set(offsetX, offsetY);
        onUpdate();
      })
      .onComplete(() => {
        if (loop) {
          this.sway(name, distance, transition);
        }
        onComplete();
      })
      .onStop(onStop)
      .start();
  }

  /**
   * Updates the points position. Should be called on every render frame.
   */
  update() {
    const {
      position: { array: bufferPositions },
      size: { array: bufferSizes },
      gradient: { array: bufferGradients },
      opacity: { array: bufferOpacities },
      color: { array: bufferColors },
    } = this._particles.geometry.attributes;

    for (const group of Object.values(this._groups)) {
      const { index, amount, swayOffset } = group;
      for (let i = index; i < index + amount; ++i) {
        const positionWithOffsets = this._getNewPosition(
          new Vector2(this._positions[i * 3], this._positions[i * 3 + 1]),
          swayOffset,
        );

        bufferPositions[i * 3] = positionWithOffsets.x;
        bufferPositions[i * 3 + 1] = positionWithOffsets.y;
        bufferPositions[i * 3 + 2] = this._positions[i * 3 + 2];
        bufferColors[i * 3] = this._colors[i * 3];
        bufferColors[i * 3 + 1] = this._colors[i * 3 + 1];
        bufferColors[i * 3 + 2] = this._colors[i * 3 + 2];
        bufferGradients[i] = this._gradients[i];
        bufferSizes[i] = this._sizes[i];
        bufferOpacities[i] = this._opacities[i];
      }
    }

    this._particles.geometry.attributes.position.needsUpdate = true;
    this._particles.geometry.attributes.size.needsUpdate = true;
    this._particles.geometry.attributes.gradient.needsUpdate = true;
    this._particles.geometry.attributes.opacity.needsUpdate = true;
    this._particles.geometry.attributes.color.needsUpdate = true;
  }

  /**
   * Returns a three.js object containing the particles.
   * To use the particles, add this object into a three.js scene.
   */
  get object() {
    return this._particles;
  }

  // TODO: call as necessary
  dispose() {
    this._particles.geometry.dispose();
    this._particles.material.dispose();
  }
}

export {
  Particles,
};

export default Particles;

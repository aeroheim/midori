import { BufferGeometry, Float32BufferAttribute, Points, Color, Vector2 } from 'three';
import TWEEN from '@tweenjs/tween.js';
import { ParticleShader } from './postprocessing/shaders/particle-shader';
import { ShaderUtils } from './postprocessing/shaders/shader-utils';

class Particles {
  _width;
  _height;
  _maxDepth;

  // groups also store the transitions related to the attributes and offsets
  _groups = {};
  _particles;
  _positions = [];

  constructor(width, height, maxDepth) {
    this._width = width;
    this._height = height;
    this._maxDepth = maxDepth;

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(0, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(0, 1));
    geometry.setAttribute('gradient', new Float32BufferAttribute(0, 1));
    geometry.setAttribute('opacity', new Float32BufferAttribute(0, 1));
    geometry.setAttribute('color', new Float32BufferAttribute(0, 3));

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
   * @param {Number} config.minSize=0 - the minimum size of the particles in world units.
   * @param {Number} config.maxSize=0 - the maximum size of the particles in world units.
   * @param {Number} config.minGradient=0 - the minimum fade gradient of the particles in relative units (0 to 1). Defaults to 0.
   * @param {Number} config.maxGradient=1 - the maximum fade gradient of the particles in relative units (0 to 1). Defaults to 1.
   * @param {Number} config.minOpacity=1 - the minimum opacity of the particles. Defaults to 0.
   * @param {Number} config.maxOpacity=1 - the maximum opacity of the particles. Defaults to 1.
   * @param {Three.Color} config.color=0xffffff - optional color of the particles. Defaults to 0xffffff.
   */
  generate(configs) {
    configs = Array.isArray(configs) ? configs : [configs];

    // cleanup previous configs and objects
    this._positions = [];
    this._groups = {};
    this._particles.geometry.dispose();
    this._particles.material.dispose();

    let index = 0;
    for (const config of configs) {
      const {
        name,
        amount = 0,
        minSize = 0,
        maxSize = 0,
        minGradient = 0,
        maxGradient = 1,
        minOpacity = 0,
        maxOpacity = 1,
        color = new Color(0xffffff),
      } = config;

      // Generate points with attributes
      for (let i = 0; i < amount || 0; ++i) {
        const x = (-this._width / 2) + Math.random() * this._width;
        const y = (-this._height / 2) + Math.random() * this._height;
        const z = (this._maxDepth / 4) * Math.random();
        this._positions.push(x, y, z);
      }

      // Store group config
      this._groups[name] = {
        name,
        index,
        amount,
        minSize,
        maxSize,
        minGradient,
        maxGradient,
        minOpacity,
        maxOpacity,
        color,
        swayOffset: new Vector2(0, 0),
      };

      index += amount;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(index * 3, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(index * 3, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(index, 1));
    geometry.setAttribute('gradient', new Float32BufferAttribute(index, 1));
    geometry.setAttribute('opacity', new Float32BufferAttribute(index, 1));

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

  /**
   * Sways a group of particles around their current positions.
   * @param {String} name - the name of the group to sway.
   * @param {three.Vector2} distance - the distances in world units allowed on each axis for swaying.
   * @param {Object} transition - optional configuration for a transition.
   * @param {Number} transition.loop=false - sway repeatedly in a loop.
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
      loop = false,
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
   * Updates the positions of particles. Should be called on every render frame.
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
      const {
        index,
        amount,
        minSize,
        maxSize,
        minGradient,
        maxGradient,
        minOpacity,
        maxOpacity,
        swayOffset,
      } = group;
      for (let i = index; i < index + amount; ++i) {
        // Apply offset to current position (excluding z).
        const position = this._getNewPosition(new Vector2(this._positions[i * 3], this._positions[i * 3 + 1]), swayOffset);

        bufferPositions[i * 3] = position.x;
        bufferPositions[i * 3 + 1] = position.y;
        bufferPositions[i * 3 + 2] = this._positions[i * 3 + 2];
        bufferColors[i * 3] = group.color.r;
        bufferColors[i * 3 + 1] = group.color.g;
        bufferColors[i * 3 + 2] = group.color.b;
        bufferSizes[i] = minSize + Math.random() * (maxSize - minSize);
        bufferGradients[i] = minGradient + Math.random() * (maxGradient - minGradient);
        bufferOpacities[i] = minOpacity + Math.random() * (maxOpacity - minOpacity);
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

  dispose() {
    this._particles.geometry.dispose();
    this._particles.material.dispose();
  }
}

export {
  Particles,
};

export default Particles;

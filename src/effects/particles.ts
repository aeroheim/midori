import { BufferGeometry, Float32BufferAttribute, Points, Color, Vector2, ShaderMaterial, MathUtils, BufferAttribute } from 'three';
import { Tween, Easing } from '@tweenjs/tween.js';
import { ParticleShader } from './shaders/particle-shader';
import { ShaderUtils } from './shaders/shader-utils';
import { LoopableTransitionConfig } from '../transition';

interface ParticleMoveOffset {
  // the distance of the offset.
  distance: number;
  // the angle of the offset in degrees.
  angle: number;
}

interface ParticleSwayOffset {
  // the x distance to sway.
  x: number;
  // the y distance to sway.
  y: number;
}

type ParticleGroupConfigs = {[name: string]: ParticleGroupConfig};
interface ParticleGroupConfig {
  // the name of the particle group.
  name: string;
  // the number of particles to generate.
  amount: number;
  // the minimum size of the particles in world units. Defaults to 0.
  minSize?: number;
  // the maximum size of the particles in world units. Defaults to 0.
  maxSize?: number;
  // the minimum fade gradient of the particles in relative units (0 to 1). Defaults to 0.
  minGradient?: number;
  // the maximum fade gradient of the particles in relative units (0 to 1). Defaults to 1.
  maxGradient?: number;
  // the minimum opacity of the particles. Defaults to 0.
  minOpacity?: number;
  // the maximum opacity of the particles. Defaults to 1.
  maxOpacity?: number;
  // optional color of the particles. Defaults to 0xffffff.
  color?: number;
  // the amount of smoothing for animated values (i.e size, gradient, opacity), specified as a value between 0 and 1. Defaults to 0.5.
  smoothing?: number;
}

interface ParticleTween {
  offsetX: number;
  offsetY: number;
}


type ParticleGroups = {[name: string]: Required<ParticleGroup>};
interface ParticleGroup extends ParticleGroupConfig {
  index: number;
  swayOffset: Vector2;
  positionTransition: Tween<ParticleTween>;
  swayTransition: Tween<ParticleTween>;
}

class Particles {
  private _width: number;
  private _height: number;
  private _maxDepth: number;

  // groups also store the transitions related to the attributes and offsets
  private _groups: ParticleGroups = {};
  private _particles: Points;
  private _positions: number[] = [];

  /**
   * Constructs a Particles object.
   * @param {number} width
   * @param {number} height
   * @param {number} maxDepth - the maximum depth of the particles in world units.
   */
  constructor(width: number, height: number, maxDepth: number) {
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
   * Returns the configurations for the currently set particle groups.
   * @returns ParticleGroupDefinitionMap
   */
  getConfigs(): ParticleGroupConfigs {
    const configs: ParticleGroupConfigs = {};
    for (const group of Object.values(this._groups)) {
      const { name, amount, minSize, maxSize, minGradient, maxGradient, minOpacity, maxOpacity, color } = group;
      configs[name] = { name, amount, minSize, maxSize, minGradient, maxGradient, minOpacity, maxOpacity, color };
    }
    return configs;
  }

  /**
   * Returns whether a group of particles is currently moving.
   * @param {string} name - the name of the particle group.
   * @returns boolean
   */
  isMoving(name: string): boolean {
    return this._groups[name]?.positionTransition.isPlaying() ?? false;
  }

  /**
   * Returns whether a group of particles is currently swaying.
   * @param {string} name - the name of the particle group.
   * @returns boolean
   */
  isSwaying(name: string): boolean {
    return this._groups[name]?.swayTransition.isPlaying() ?? false;
  }

  /**
   * Generates particles based on a given set of configurations.
   * @param {ParticleGroupConfig | ParticleGroupConfig[]} config - a single or array of particle group configurations.
   */
  generate(configs: ParticleGroupConfig | ParticleGroupConfig[]): void {
    // cleanup previous configs and objects
    this.removeAll();

    configs = Array.isArray(configs) ? configs : [configs];
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
        color = 0xffffff,
        smoothing = 0.5,
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
        smoothing,
        swayOffset: new Vector2(0, 0),
        positionTransition: new Tween({ offsetX: 0, offsetY: 0 }),
        swayTransition: new Tween({ offsetX: 0, offsetY: 0 }),
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
   * Removes all particle groups.
   */
  removeAll(): void {
    for (const group in this._groups) {
      // stop any ongoing transitions
      this._groups[group].positionTransition.stop();
      this._groups[group].swayTransition.stop();
    }

    // reset particles to empty
    this._positions = [];
    this._groups = {};
    this._particles.geometry.dispose();
    (this._particles.material as ShaderMaterial).dispose();
  }

  /**
   * Calculates a new position based off an existing position and optional offset. Will wrap around boundaries.
   * @param {Vector2} position - the current position.
   * @param {Vector2} offset - the offset from the current position.
   * @returns Vector2
   */
  private _getNewPosition(position: Vector2, offset: Vector2): Vector2 {
    let { x: offsetX, y: offsetY } = offset;
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

    return new Vector2(x, y);
  }

  /**
   * Updates the internal positions for particles. This does NOT update the attributes of the BufferGeometry.
   * @param {number} index - the index to start at.
   * @param {number} amount - the number of particles.
   * @param {number[]} positions - an array containing the position values to use.
   * @param {Vector2} offset - an optional offset to apply to all new position values.
   */
  private _updatePositions(index: number, amount: number, positions: number[], offset: Vector2) {
    // Each vertex position is a set of 3 values, so index and amount are adjusted accordingly when iterating.
    for (let i = index; i < index + amount; ++i) {
      const { x, y } = this._getNewPosition(new Vector2(positions[i * 3], positions[i * 3 + 1]), offset);
      this._positions[i * 3] = x;
      this._positions[i * 3 + 1] = y;
    }
  }

  /**
   * Moves a group of particles. Cancels any in-progress moves.
   * @param {string} name - the name of the group to move.
   * @param {ParticleMoveOffset | boolean} offset - the distance and angle in radians to move.
   * If a boolean is passed in instead then the move will either continue or stop based on the value.
   * @param {LoopableTransitionConfig} transition - an optional transition configuration.
   */
  move(name: string, offset: ParticleMoveOffset | boolean, transition: LoopableTransitionConfig): void {
    const group = this._groups[name];
    const { index, amount } = group;

    if (typeof offset === 'boolean') {
      if (!offset) {
        group.positionTransition.stop();
      }
      return;
    }

    // Stop ongoing position transition for group.
    group.positionTransition.stop();

    const {
      loop = false,
      duration = 0,
      easing = Easing.Linear.None,
      onStart = () => ({}),
      onUpdate = () => ({}),
      onComplete = () => ({}),
      onStop = () => ({}),
    } = transition;

    const { distance, angle } = offset;
    const offsetX = distance * Math.cos(MathUtils.degToRad(angle));
    const offsetY = distance * Math.sin(MathUtils.degToRad(angle));
    if (duration > 0) {
      // Each vertex position is a set of 3 values, so adjust index and amount accordingly.
      const startPositions = this._positions.slice();
      group.positionTransition = new Tween({ offsetX: 0, offsetY: 0 })
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
      this._updatePositions(index, amount, this._positions, new Vector2(offsetX, offsetY));
    }
  }

  /**
   * Sways a group of particles around their current positions. Cancels any in-progress sways.
   * @param {string} name - the name of the group to sway.
   * @param {ParticleSwayOffset | boolean} offset - the distances in world units allowed on each axis for swaying.
   * If a boolean is passed in instead then the sway will either continue or stop based on the value.
   * @param {LoopableTransitionConfig} transition - optional configuration for a transition.
   */
  sway(name: string, offset: ParticleSwayOffset | boolean, transition: LoopableTransitionConfig = {}): void {
    const group = this._groups[name];
    const { swayOffset } = group;

    if (typeof offset === 'boolean') {
      if (!offset) {
        group.swayTransition.stop();
      }
      return;
    }

    // Stop ongoing sway transition for group.
    group.swayTransition.stop();

    const {
      loop = false,
      duration = 0,
      easing = Easing.Linear.None,
      onStart = () => ({}),
      onUpdate = () => ({}),
      onComplete = () => ({}),
      onStop = () => ({}),
    } = transition;

    const { x, y } = offset;
    group.swayTransition = new Tween({
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
          this.sway(name, offset, transition);
        }
        onComplete();
      })
      .onStop(onStop)
      .start();
  }

  /**
   * Generates a new random averaged value based off a given value and its range.
   * @param {number} prevValue - the previous value.
   * @param {number} minValue - the minimum value for the given value.
   * @param {number} maxValue - the maximum value for the given value.
   * @param {number} smoothing - optional amount of smoothing to use as a value between 0 and 1. Defaults to 0.5.
   * @returns number
   */
  private _generateNewRandomAveragedValue(prevValue: number, minValue: number, maxValue: number, smoothing = 0.5): number {
    // cap smoothing at 0.95
    smoothing = Math.min(smoothing, 0.95);
    const offset = (maxValue - minValue) / 2;
    const nextValue = Math.max(Math.min(prevValue + (-offset + Math.random() * offset * 2), maxValue), minValue);
    const smoothedValue = (prevValue * smoothing) + (nextValue * (1 - smoothing));
    return Math.max(Math.min(smoothedValue, maxValue), minValue);
  }

  /**
   * Updates the positions of the particles. Should be called on every render frame.
   */
  update(): void {
    const { attributes } = this._particles.geometry;
    const {
      position: positions,
      size: sizes,
      gradient: gradients,
      opacity: opacities,
      color: colors,
    } = attributes;

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
        color,
        smoothing,
        swayOffset,
      } = group;
      for (let i = index; i < index + amount; ++i) {
        // Apply offset to current position (excluding z).
        const position = this._getNewPosition(new Vector2(this._positions[i * 3], this._positions[i * 3 + 1]), swayOffset);
        const rgb = new Color(color);

        positions.setXYZ(i, position.x, position.y, this._positions[i * 3 + 2]);
        colors.setXYZ(i, rgb.r, rgb.g, rgb.b);
        sizes.setX(i, this._generateNewRandomAveragedValue(sizes.getX(i), minSize, maxSize, smoothing));
        gradients.setX(i, this._generateNewRandomAveragedValue(gradients.getX(i), minGradient, maxGradient, smoothing));
        opacities.setX(i, this._generateNewRandomAveragedValue(opacities.getX(i), minOpacity, maxOpacity, smoothing));
      }
    }

    (attributes.position as BufferAttribute).needsUpdate = true;
    (attributes.size as BufferAttribute).needsUpdate = true;
    (attributes.gradient as BufferAttribute).needsUpdate = true;
    (attributes.opacity as BufferAttribute).needsUpdate = true;
    (attributes.color as BufferAttribute).needsUpdate = true;
  }

  /**
   * Returns a three.js object containing the particles.
   * To use the particles, add this object into a three.js scene.
   * @returns Points
   */
  get object(): Points {
    return this._particles;
  }

  /**
   * Disposes this object. Call when this object is no longer needed, otherwise leaks may occur.
   */
  dispose(): void {
    this._particles.geometry.dispose();
    (this._particles.material as ShaderMaterial).dispose();
  }
}

export {
  ParticleMoveOffset,
  ParticleSwayOffset,
  ParticleGroupConfigs,
  ParticleGroupConfig,
  Particles,
};

export default Particles;

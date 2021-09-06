# midori
[![npm version](https://img.shields.io/npm/v/midori-bg.svg)](https://npmjs.org/package/midori-bg "View this project on npm")

<div>
  <img width="32%" src="./docs/assets/midori.1.gif"/>
  <img width="32%" src="./docs/assets/midori.2.gif"/>
  <img width="32%" src="./docs/assets/midori.3.gif"/>
</div>

**[Interactive demo available here (with credits to artists).](https://aeroheim.github.io/midori/)**

## About
Library for animating image backgrounds in websites using WebGL.

It support the following:
* Configurable dynamic camera
* Animated transitions between backgrounds
* Post-processing effects & particles

## Usage / API
### Getting Started
First install `midori-bg` and `three`. Three.js is required as a dependency - any version greater than or equal to `three@0.132.2` should work. (if not, please file an issue)
```console
npm install --save midori-bg three
```

Below is an example of how to get started with midori in an ES6 app. For an example in `React`, see the [source for the interactive demo](./docs/index.jsx).

You'll want to first initialize a renderer before loading and setting images as backgrounds.

```js
import { BackgroundRenderer, loadImage } from 'midori-bg';

// pass in a canvas DOM element
const renderer = new BackgroundRenderer(document.getElementById('canvas'));

// the loadImage function returns a promise which you can use to load your images.
// the path can be a url or local path to a file. Make sure to check CORS if using a url.
loadImage('url/to/image')
  // set background
  .then((image) => renderer.setBackground(image))
  // handle errors
  .catch(err => console.error(err));
```

### Transitions
When setting backgrounds, you can use an optional transition to animate the switching between backgrounds.

```js
import { BackgroundRenderer, TransitionType, Easings, SlideDirection } from 'midori-bg';

const renderer = new BackgroundRenderer(document.getElementById('canvas'));

loadImage('url/to/image')
  .then((image) => {
    // set a new background with a slide transition.
    renderer.setBackground(image, {
      type: TransitionType.Slide,
      config: {
        slides: 2,
        intensity: 5,
        duration: 1.5,
        easing: Easings.Quintic.InOut,
        direction: SlideDirection.Right,
      }
    });
  })
  // handle errors
  .catch(err => console.error(err));
```

The state of the transition can be queried:

```js
const isTransitioning = renderer.isTransitioning();
```

The configuration options for transitions:
```ts
interface BlendTransitionConfig {}

interface WipeTransitionConfig {
  // the size of the fade when wiping.
  gradient?: number;
  // the angle of the wipe in degrees.
  angle?: number;
  // the direction of the wipe.
  direction?: WipeDirection;
}

interface SlideTransitionConfig {
  // the number of slides to perform.
  slides?: number;
  // the intensity of the blur during slides.
  intensity?: number;
  // the number of samples for the blur - more samples result in better quality at the cost of performance.
  samples?: number;
  // the direction of the slide.
  direction?: SlideDirection;
}

interface BlurTransitionConfig {
  // the intensity of the blur.
  intensity?: number;
  // the number of samples for the blur - more samples result in better quality at the cost of performance.
  samples?: number;
}

interface GlitchTransitionConfig {
  // a random seed from 0 to 1 used to generate glitches.
  seed?: number;
}
```

### Camera
Each background comes with its own camera. The camera can be moved, swayed, and rotated independently.

> **⚠️NOTE:** Be careful when storing camera references! When switching to a new background, a new camera will be created. Settings configured on the previous camera are not transferred.

```js
import { BackgroundRenderer, Easings } from 'midori-bg';

const renderer = new BackgroundRenderer(document.getElementById('canvas'));
const { camera } = renderer.background;

// move the camera to the top-left corner, fully zoomed-out.
camera.move({ x: 0, y: 0, z: 1 });

// move the camera to the bottom-right corner, fully zoomed-out.
camera.move({ x: 1, y: 1, z: 1});

// move the camera to the center, half zoomed-in.
camera.move({ x: 0.5, y: 0.5, z: 0.5 });

// move the camera with a transition.
camera.move({ x: Math.random(), y: Math.random(), z: 0.5 + Math.random() * 0.5 }, {
  duration: 2.5,
  easing: Easings.Cubic.InOut,
});

// offset the camera from its current position.
// x - offset to the left by 10% of the background width
// y - offset to the bottom by 20% of the background height
// z - offset the zoom by zooming in 20% of the maximum zoom
// zr - offset the rotation by rotating 15 degrees
camera.offset({ x: -0.1, y: 0.2, z: -0.2, zr: 15 });

// rotate the camera by 30 degrees with a transition.
camera.rotate(30, {
  duration: 2.5,
  easing: Easings.Cubic.InOut,
});

// sway the camera around its center with a transition.
// x - up to 10% of the background width away from the center
// y - up to 5% of the background height away from the center
// z - up to 2% of the maximum zoom from the center
// zr - up to 1 degree of rotation from the center
camera.sway({ x: 0.1, y: 0.05, z: 0.02, zr: 1 }, {
  duration: 1.5,
  easing: Easings.Quadratic.InOut,
  loop: true,
});
```

The state of the camera can be queried:
```js
// the current position of the camera, excluding offsets from the position offset and swaying.
const position = camera.position;
// the current offset of the camera.
const positionOffset = camera.positionOffset;

// cancel any in-progress movement
if (camera.isMoving()) {
  camera.move(false);
}

// cancel any in-progress rotation
if (camera.isRotating()) {
  camera.rotate(false);
}

// cancel any in-progress swaying
if (camera.isSwaying()) {
  camera.sway(false);
}
```

### Effects
Each background comes with its own effects. The `BackgroundRenderer` also exposes a global `effects` object that is applied on top of all backgrounds.

> **⚠️NOTE:** The global `BackgroundRenderer` effects object does not support the following effect: `EffectType.MotionBlur`

> **⚠️NOTE:** Be careful when storing effect references! When switching to a new background, a new set of effects will be created for it. Previously configured effects are not transferred.
>
> If you don't need different effects on multiple backgrounds or do expect to switch backgrounds often, consider using the `BackgroundRenderer`'s effects instead.

```js
import { BackgroundRenderer, EffectType } from 'midori-bg';

const renderer = new BackgroundRenderer(document.getElementById('canvas'));

// the global effects object - effects set here apply to all backgrounds
const { effects: globalEffects } = renderer;
globalEffects.set(EffectType.Vignette, { darkness: 1, offset: 1 });

// the background effects object - effects set here apply only to the specific background
const { effects } = renderer.background;
effects.set(EffectType.MotionBlur, { intensity: 1, samples: 32 });
effects.set(EffectType.RgbShift, { amount: 0.005, angle: 135 });
effects.set(EffectType.VignetteBlur, { size: 3, radius: 1.5, passes: 2 });
```

The state of the effects can be queried:
```js
// get a copy of the current effects configurations
const configs = effects.getConfigs();

// remove an effect
if (globalEffects.hasEffect(EffectType.Vignette)) {
  globalEffects.remove(EffectType.Vignette);
}

// remove all effects
if (effects.hasEffects()) {
  effects.removeAll();
}
```

The configuration options for effects:

> **⚠️NOTE:** Effects that involve blurring such as `EffectType.Blur`, `EffectType.VignetteBlur`, and `EffectType.MotionBlur` can potentially be expensive. It is important to balance visual quality and performance when using such effects.

```ts
interface BlurEffectConfig {
  // the size of the blur.
  radius?: number;
  // the number of blur passes - more passes result in stronger blurs and less artifacts at the cost of performance.
  passes?: number;
}

interface MotionBlurEffectConfig {
  // the intensity of the blur.
  intensity?: number;
  // the number of samples for the blur - more samples result in better quality at the cost of performance.
  samples?: number;
}

interface BloomEffectConfig {
  // the overall brightness of the bloom.
  opacity?: number;
  // the size of the bloom.
  radius?: number;
  // the number of bloom passes - more passes result in stronger blooms and less artifacts at the cost of performance.
  passes?: number;
}

interface RgbShiftEffectConfig {
  // the distance of the shift.
  amount?: number;
  // the angle of the shift in degrees.
  angle?: number;
}

interface VignetteEffectConfig {
  // the size of the vignette.
  offset?: number;
  // the intensity of the vignette.
  darkness?: number;
}

interface VignetteBlurEffectConfig {
  // the size of the vignette.
  size?: number;
  // the size of the blur.
  radius?: number;
  // the number of blur passes - more passes result in stronger blurs and less artifacts at the cost of performance.
  passes?: number;
}
```

### Particles
Each background comes with its own particles. The particles can be grouped, moved, and swayed independently.

> **⚠️NOTE:** Be careful when storing particle references! When switching to a new background, a new particles object will be created. Settings configured on the previous particles are not transferred.

```js
import { BackgroundRenderer, Easings } from 'midori-bg';

const renderer = new BackgroundRenderer(document.getElementById('canvas'));

const { particles } = renderer.background;

// generate two named groups of particles in the background.
particles.generate([
  {
    name: 'small',
    amount: 200,
    maxSize: 5,
    maxOpacity: 0.8,
    minGradient: 0.75,
    maxGradient: 1.0,
    color: 0xffffff,
    smoothing: 0.6,
  },
  {
    name: 'large',
    amount: 30,
    minSize: 100,
    maxSize: 125,
    maxOpacity: 0.05,
    minGradient: 1.0,
    maxGradient: 1.0,
    color: 0xffffff,
  },
]);

// move the particles by a distance and angle in degrees with a transition.
particles.move('small', { distance: 0.5, angle: 25 }, { duration: 5, loop: true });
particles.move('large', { distance: 0.4, angle: 35 }, { duration: 5, loop: true });

// sway the particles up to a given distance with a transition.
particles.sway('small', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: Easings.Sinusoidal.InOut, loop: true });
particles.sway('large', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: Easings.Sinusoidal.InOut, loop: true });

// removes all particles.
particles.removeAll();
```

The state of the particles can also be queried:
```js
// get a copy of the current particles configuration.
const configs = particles.getConfigs();

// cancel any in-progress movement
if (particles.isMoving('small')) {
  particles.move('small', false);
}

// cancel any in-progress swaying
if (particles.isSwaying('large')) {
  camera.sway('large', false);
}
```

The configuration options for particles:
```ts
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
```

### Animation Callbacks & Easings
Callbacks can be passed in for transitions in backgrounds, cameras, and particles. Certain transitions are loopable.
```ts
interface TransitionConfig {
  // the duration of the transition in seconds.
  duration?: number;
  // an optional delay before the transition starts in seconds.
  delay?: number;
  // an optional easing function for the transition.
  easing?: (k: number) => number;
  // an optional callback - invoked when the transition is registered, regardless of delay.
  onInit?: (...args: any[]) => void;
  // an optional callback - invoked when the transition starts after the delay has elapsed.
  onStart?: (...args: any[]) => void;
  // an optional callback - invoked for each frame that the transition runs.
  onUpdate?: (...args: any[]) => void;
  // an optional callback - invoked when the transition has finished.
  onComplete?: (...args: any[]) => void;
  // an optional callback - invoked when the transition is interrupted or stopped.
  onStop?: (...args: any[]) => void;
}

interface LoopableTransitionConfig extends TransitionConfig {
  // whether to loop the transition repeatedly or not.
  loop?: boolean;
}

interface BackgroundTransitionConfig extends TransitionConfig {
  onInit?: (prevBackground?: Background, nextBackground?: Background) => void;
  onStart?: (prevBackground?: Background, nextBackground?: Background) => void;
  onUpdate?: (prevBackground?: Background, nextBackground?: Background) => void;
  onComplete?: (prevBackground?: Background, nextBackground?: Background) => void;
  onStop?: (prevBackground?: Background, nextBackground?: Background) => void;
}
```

A set of easing functions are available via the `Easings` import. A custom easing function can also be provided if desired.
```js
import { BackgroundRenderer, Easings } from 'midori-bg';

const renderer = new BackgroundRenderer(document.getElementById('canvas'));
const { camera } = renderer.background;

// move the camera with a transition using a pre-defined easing.
camera.move({ x: Math.random(), y: Math.random(), z: 0.5 + Math.random() * 0.5 }, {
  duration: 2.5,
  easing: Easings.Cubic.InOut,
});

// move the camera with a transition using a custom easing.
camera.move({ x: Math.random(), y: Math.random(), z: 0.5 + Math.random() * 0.5 }, {
  duration: 2.5,
  easing: k => k * 2,
});
```

Optional callbacks can be utilized for more advanced transitions (e.g sequencing camera movements).
```js
import { BackgroundRenderer, TransitionType, Easings, SlideDirection } from 'midori-bg';

const renderer = new BackgroundRenderer(document.getElementById('canvas'));

loadImage('url/to/image')
  .then((image) => {
    // set a new background with a slide transition.
    renderer.setBackground(image, {
      type: TransitionType.Slide,
      config: {
        slides: 2,
        intensity: 5,
        duration: 1.5,
        easing: Easings.Quintic.InOut,
        direction: SlideDirection.Right,
      },
      // the previous and next background are available in the optional transition callbacks
      // you can use transition callbacks to do more advanced transitions (e.g sequencing camera movements)
      onStart: (prevBackground, nextBackground) => {
        prevBackground.camera.move({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7 }, {
          duration: 2.5,
          easing: Easings.Quartic.In,
        });
        prevBackground.camera.rotate(-5 + Math.random() * 10, {
          duration: 2.5,
          easing: Easings.Quartic.In,
        });
        nextBackground.camera.move({ x: Math.random(), y: Math.random(), z: 0.7 + Math.random() * 0.3 }, {
          duration: 2,
          easing: Easings.Quartic.Out,
        });
        nextBackground.camera.sway({ x: 0.1, y: 0.05, z: 0.02, zr: 1 }, {
          duration: 1.5,
          easing: Easings.Quadratic.InOut,
          loop: true,
        });
        nextBackground.camera.rotate(-5 + Math.random() * 10, {
          duration: 2,
          easing: Easings.Quartic.Out,
        });
      },
    });
  })
  // handle errors
  .catch(err => console.error(err));
```

### Cleanup
Midori allocates resources that are not automatically disposed. Make sure to always clean-up properly when finished:
```jsx
import { BackgroundRenderer } from 'midori-bg';

const renderer = new BackgroundRenderer(document.getElementById('canvas'));
renderer.dispose();
```

### Full API
For the full API, see the [typings file](./dist/midori.d.ts).

## Contributing
Contributions are welcome! Feel free to submit issues or PRs for any bugs or feature requests.

To get started, run `npm run dev` and navigate to `localhost:8080` to launch the interactive demo. Any changes made to the source will be hot reloaded in the demo.

## License
See the [license file](./LICENSE).

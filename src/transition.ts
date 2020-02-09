import TWEEN from '@tweenjs/tween.js';
import { SlideDirection } from './effects/shaders/transition/slide-shader';
import { WipeDirection } from './effects/shaders/transition/wipe-shader';

const Easings = {
  Linear: {
    None: TWEEN.Easing.Linear.None,
  },
  Quadratic: {
    In: TWEEN.Easing.Quadratic.In,
    Out: TWEEN.Easing.Quadratic.Out,
    InOut: TWEEN.Easing.Quadratic.InOut,
  },
  Cubic: {
    In: TWEEN.Easing.Cubic.In,
    Out: TWEEN.Easing.Cubic.Out,
    InOut: TWEEN.Easing.Cubic.InOut,
  },
  Quartic: {
    In: TWEEN.Easing.Quartic.In,
    Out: TWEEN.Easing.Quartic.Out,
    InOut: TWEEN.Easing.Quartic.InOut,
  },
  Quintic: {
    In: TWEEN.Easing.Quintic.In,
    Out: TWEEN.Easing.Quintic.Out,
    InOut: TWEEN.Easing.Quintic.InOut,
  },
  Sinusoidal: {
    In: TWEEN.Easing.Sinusoidal.In,
    Out: TWEEN.Easing.Sinusoidal.Out,
    InOut: TWEEN.Easing.Sinusoidal.InOut,
  },
  Exponential: {
    In: TWEEN.Easing.Exponential.In,
    Out: TWEEN.Easing.Exponential.Out,
    InOut: TWEEN.Easing.Exponential.InOut,
  },
  Circular: {
    In: TWEEN.Easing.Circular.In,
    Out: TWEEN.Easing.Circular.Out,
    InOut: TWEEN.Easing.Circular.InOut,
  },
  Elastic: {
    In: TWEEN.Easing.Elastic.In,
    Out: TWEEN.Easing.Elastic.Out,
    InOut: TWEEN.Easing.Elastic.InOut,
  },
  Back: {
    In: TWEEN.Easing.Back.In,
    Out: TWEEN.Easing.Back.Out,
    InOut: TWEEN.Easing.Back.InOut,
  },
  Bounce: {
    In: TWEEN.Easing.Bounce.In,
    Out: TWEEN.Easing.Bounce.Out,
    InOut: TWEEN.Easing.Bounce.InOut,
  },
}

export interface TransitionConfig {
  // the duration of the transition in seconds.
  duration?: number;
  // an optional delay before the transition starts in seconds.
  delay?: number;
  // an optional easing function for the transition.
  easing?: (k: number) => number;
  // an optional callback - invoked when the transition is registered, regardless of delay.
  onInit?: () => void;
  // an optional callback - invoked when the transition starts after the delay has elapsed.
  onStart?: () => void;
  // an optional callback - invoked for each frame that the transition runs.
  onUpdate?: () => void;
  // an optional callback - invoked when the transition has finished.
  onComplete?: () => void;
  // an optional callback - invoked when the transition is interrupted or stopped.
  onStop?: () => void;
}

export interface LoopableTransitionConfig extends TransitionConfig {
  // whether to loop the transition repeatedly or not.
  loop?: boolean;
}

export {
  Easings
};
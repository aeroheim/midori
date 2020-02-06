import TWEEN from '@tweenjs/tween.js';

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

export interface BaseTransitionConfig {
  loop?: boolean;
  duration?: number;
  delay?: number;
  easing?: (k: number) => number;
  onInit?: () => void;
  onStart?: () => void;
  onUpdate?: () => void;
  onComplete?: () => void;
  onStop?: () => void;
}

export {
  Easings
};
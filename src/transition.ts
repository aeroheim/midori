import { Easing } from '@tweenjs/tween.js';
import { Background } from './background';

const Easings = Easing;

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
  onInit?: (prevBackground: Background, nextBackground: Background) => void;
  onStart?: (prevBackground: Background, nextBackground: Background) => void;
  onUpdate?: (prevBackground: Background, nextBackground: Background) => void;
  onComplete?: (prevBackground: Background, nextBackground: Background) => void;
  onStop?: (prevBackground: Background, nextBackground: Background) => void;
}

export {
  TransitionConfig,
  LoopableTransitionConfig,
  BackgroundTransitionConfig,
  Easings,
};
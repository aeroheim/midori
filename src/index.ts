import { BackgroundRenderer, loadImage } from './background-renderer';

let renderer;

let image = 0;
const imageCount = 3;

function init() {
  renderer = new BackgroundRenderer(document.getElementById('canvas') as HTMLCanvasElement);
  loadImage(`images/${image}.png`)
    .then((texture) => {
      renderer.setBackground(texture);
    })
    .catch(e => console.log(e));
}

// init renderer
window.onload = init;
window.onkeyup = (e) => {
  if (e.key === 'ArrowLeft') {
    if (!renderer.isTransitioning()) {
      const newIndex = (((image - 1) % imageCount) + imageCount) % imageCount;
      loadImage(`images/${newIndex}.png`)
        .then((texture) => {
          requestAnimationFrame(() => {
            renderer.setBackground(texture);
            image = newIndex;
          });
        })
        .catch(e => console.log(e));
    }
  } else if (e.key === 'ArrowRight') {
    if (!renderer.isTransitioning()) {
      loadImage(`images/${(image + 1) % imageCount}.png`)
        .then((texture) => {
          requestAnimationFrame(() => {
            renderer.setBackground(texture);
            image = (image + 1) % imageCount;
          });
        })
        .catch(e => console.log(e));
    }
  } else if (e.key === ' ') {
    renderer.test();
  }
};

/*
  // TODO: for testing purposes
  test() {
    const { camera } = this._backgroundPass.background;
    camera.move({ x: Math.random(), y: Math.random(), z: 0.5 + Math.random() * 0.5 }, {
      duration: 2,
      easing: TWEEN.Easing.Cubic.InOut,
    });
    camera.rotate(MathUtils.degToRad(-5 + Math.random() * 10), {
      duration: 2,
      easing: TWEEN.Easing.Cubic.InOut,
    });
  }


  setBackground(texture) {
    const transitions = [
      {
        type: TransitionType.Wipe,
        config: {
          gradient: 0.5,
          angle: MathUtils.degToRad(15),
          duration: 1.5,
          easing: TWEEN.Easing.Quintic.InOut,
          direction: WipeDirection[Object.keys(WipeDirection)[Math.floor(Math.random() * Object.keys(WipeDirection).length)]],
        },
      },
      {
        type: TransitionType.Blur,
        config: {
          duration: 1,
          intensity: 1.5,
          easing: TWEEN.Easing.Quintic.InOut,
        },
      },
      {
        type: TransitionType.Slide,
        config: {
          slides: 2,
          intensity: 5,
          duration: 1.5,
          easing: TWEEN.Easing.Quintic.InOut,
          direction: SlideDirection[Object.keys(SlideDirection)[Math.floor(Math.random() * Object.keys(SlideDirection).length)]],
        },
      },
      {
        type: TransitionType.Glitch,
        config: {
          seed: Math.random(),
          from: { amount: 0.0 },
          to: { amount: 1.0 },
          duration: 1.5,
          easing: TWEEN.Easing.Cubic.InOut,
        }
      }
    ];

    const { clientWidth: width, clientHeight: height } = this._renderer.domElement;

    const prevBackground = this._backgroundPass.background;
    const nextBackground = new Background(texture, width, height);
    nextBackground.effects.set(EffectType.Bloom, { radius: 2, passes: 1 });
    // nextBackground.effects.set(EffectType.Blur, { radius: 1, passes: 6 });
    nextBackground.effects.set(EffectType.VignetteBlur, { size: 3, radius: 1.5, passes: 2 });
    // nextBackground.effects.set(EffectType.RgbShift, { amount: 0.005, angle: 135 });
    nextBackground.effects.set(EffectType.MotionBlur, { intensity: 1, samples: 32 });
    nextBackground.effects.set(EffectType.Vignette, { darkness: 1, offset: 1 });
    // nextBackground.effects.set(EffectType.Glitch, { amount: 0.8, seed: Math.random() });
    nextBackground.particles.generate([
      {
        name: 'small',
        amount: 200,
        maxSize: 5,
        maxOpacity: 0.8,
        minGradient: 0.75,
        maxGradient: 1.0,
      },
      {
        name: 'medium',
        amount: 50,
        maxSize: 12,
        maxOpacity: 0.8,
        minGradient: 0.75,
        maxGradient: 1.0,
      },
      {
        name: 'large',
        amount: 30,
        minSize: 100,
        maxSize: 125,
        maxOpacity: 0.05,
        minGradient: 1.0,
        maxGradient: 1.0,
      },

    ]);
    nextBackground.particles.move('small', { distance: 0.5, angle: 25 }, { duration: 5, loop: true });
    nextBackground.particles.sway('small', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: TWEEN.Easing.Sinusoidal.InOut, loop: true });
    nextBackground.particles.move('medium', { distance: 0.3, angle: 45 }, { duration: 5, loop: true });
    nextBackground.particles.sway('medium', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: TWEEN.Easing.Sinusoidal.InOut, loop: true });
    nextBackground.particles.move('large', { distance: 0.4, angle: 35 }, { duration: 5, loop: true });
    nextBackground.particles.sway('large', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: TWEEN.Easing.Sinusoidal.InOut, loop: true });

    const { type, config } = transitions[Math.floor(Math.random() * transitions.length)];
    this._transitionPass.transition(type as any, nextBackground, {
      ...config,
      delay: 1.25,
      onInit: () => {
        prevBackground.camera.move({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7 }, {
          duration: 2.5,
          easing: TWEEN.Easing.Quartic.In,
        });
        prevBackground.camera.rotate(-5 + Math.random() * 10, {
          duration: 2.5,
          easing: TWEEN.Easing.Quartic.In,
        });
      },
      onStart: () => {
        this._backgroundPass.setBackground(nextBackground);

        nextBackground.camera.move({ x: Math.random(), y: Math.random(), z: 0.7 + Math.random() * 0.3 }, {
          duration: 2,
          easing: TWEEN.Easing.Quartic.Out,
        });
        nextBackground.camera.sway({ x: 0.1, y: 0.05, z: 0.02, zr: 1 }, {
          duration: 1.5,
          easing: TWEEN.Easing.Quadratic.InOut,
          loop: true,
        });
        nextBackground.camera.rotate(-5 + Math.random() * 10, {
          duration: 2,
          easing: TWEEN.Easing.Quartic.Out,
        });
      },
    });
  }
*/

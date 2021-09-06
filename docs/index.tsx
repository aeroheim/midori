import React, { ReactElement, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Texture } from 'three';
import { BackgroundRenderer, Background, loadImage, TransitionType, EffectType, Easings, WipeDirection, SlideDirection } from '../dist/midori';

function getEffectTypeString(effectType: EffectType) {
  switch (effectType) {
    case EffectType.RgbShift:
      return 'RGB Shift';
    case EffectType.MotionBlur:
      return 'Motion Blur';
    case EffectType.VignetteBlur:
      return 'Vignette Blur';
    default:
      return effectType;
  }
}

function getTransitionConfig(type: TransitionType) {
  switch (type) {
    case TransitionType.Blend:
      return {
        duration: 1.5,
        easing: Easings.Quartic.InOut,
      };
    case TransitionType.Wipe:
      return {
        duration: 1.5,
        easing: Easings.Quartic.InOut,
        gradient: 0.5,
        angle: 15,
        direction: WipeDirection[Object.keys(WipeDirection)[Math.floor(Math.random() * Object.keys(WipeDirection).length)]],
      };
    case TransitionType.Blur:
      return {
        duration: 1,
        easing: Easings.Quintic.InOut,
        intensity: 1.5,
      };
    case TransitionType.Slide:
      return {
        duration: 1.5,
        easing: Easings.Quintic.InOut,
        slides: 2,
        intensity: 5,
        direction: SlideDirection[Object.keys(SlideDirection)[Math.floor(Math.random() * Object.keys(SlideDirection).length)]],
      };
    case TransitionType.Glitch:
      return {
        seed: Math.random(),
        duration: 1.5,
        easing: Easings.Cubic.InOut,
      };
    default:
      return {};
  }
}

function setBackgroundEffects(background: Background, effects: EffectType[]) {
  const { effects: backgroundEffects } = background;
  backgroundEffects.removeAll();
  for (const effect of effects) {
    switch (effect) {
      case EffectType.Blur:
        backgroundEffects.set(EffectType.Blur, { radius: 1.5, passes: 2 });
        break;
      case EffectType.MotionBlur:
        backgroundEffects.set(EffectType.MotionBlur, { intensity: 1, samples: 32 });
        break;
      case EffectType.Bloom:
        backgroundEffects.set(EffectType.Bloom, { radius: 1, passes: 2 });
        break;
      case EffectType.RgbShift:
        backgroundEffects.set(EffectType.RgbShift, { amount: 0.005, angle: 135 });
        break;
      case EffectType.Vignette:
        backgroundEffects.set(EffectType.Vignette, { darkness: 1, offset: 1 });
        break;
      case EffectType.VignetteBlur:
        backgroundEffects.set(EffectType.VignetteBlur, { size: 3, radius: 1.5, passes: 2 });
        break;
    }
  }
}

function setBackgroundParticles(background: Background) {
  const { particles } = background;
  particles.generate([
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
      smoothing: 0.8,
    },
    {
      name: 'large',
      amount: 30,
      minSize: 100,
      maxSize: 125,
      maxOpacity: 0.04,
      minGradient: 1.0,
      maxGradient: 1.0,
      smoothing: 0.65,
    },
  ]);
  particles.move('small', { distance: 0.5, angle: 25 }, { duration: 5, loop: true });
  particles.move('medium', { distance: 0.3, angle: 45 }, { duration: 5, loop: true });
  particles.move('large', { distance: 0.4, angle: 35 }, { duration: 5, loop: true });
  particles.sway('small', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: Easings.Sinusoidal.InOut, loop: true });
  particles.sway('medium', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: Easings.Sinusoidal.InOut, loop: true });
  particles.sway('large', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: Easings.Sinusoidal.InOut, loop: true });
}

function setRendererBackground(renderer: BackgroundRenderer, background: Texture, transition: TransitionType) {
  const delay = 1.25;
  renderer.setBackground(background, {
    type: transition,
    config: {
      ...getTransitionConfig(transition),
      delay,
      onInit: (prevBackground, nextBackground) => {
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
          delay,
          easing: Easings.Quartic.Out,
        });
        nextBackground.camera.sway({ x: 0.1, y: 0.05, z: 0.02, zr: 1 }, {
          duration: 3,
          easing: Easings.Quadratic.InOut,
          loop: true,
        });
        nextBackground.camera.rotate(-5 + Math.random() * 10, {
          duration: 2,
          delay,
          easing: Easings.Quartic.Out,
        });
      },
    }
  });

  setBackgroundParticles(renderer.background);
}

interface SectionProps {
  className?: string;
  label: string;
  icon?: ReactElement;
  rule?: boolean;
  children: ReactElement | ReactElement[];
}

function Section(props: SectionProps): ReactElement<SectionProps> {
  const {
    className = '',
    label, icon,
    rule = false,
    children
  } = props;

  return (
    <>
      <div className={className}>
        <h1 className='section-header'>
          {label}
          {icon}
        </h1>
        {children}
      </div>
      {rule ? <hr className='rule'/> : null}
    </>
  );
}

interface Images {
  image: Texture;
  title: string;
  artist: string;
  profile: string;
  source: string;
}

interface ExampleProps {
  images: Images[];
}

function Example(props: ExampleProps): ReactElement<ExampleProps> {
  const { images } = props;

  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [renderer, setRenderer] = useState<BackgroundRenderer>();
  useEffect(() => {
    if (canvasRef !== null) {
      const backgroundRenderer = new BackgroundRenderer(canvasRef);
      setRenderer(backgroundRenderer);
      return () => backgroundRenderer.dispose();
    }
  }, [images, canvasRef]);

  const transitionRef = useRef<TransitionType>(TransitionType.Wipe);
  const [transition, setTransition] = useState<TransitionType>(transitionRef.current);
  useEffect(() => {
    transitionRef.current = transition;
  }, [transition]);

  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (renderer !== undefined) {
      setRendererBackground(renderer, images[index].image, transitionRef.current);
    }
  }, [images, index, renderer]);

  const [effects, setEffects] = useState<EffectType[]>([ EffectType.Bloom, EffectType.MotionBlur, EffectType.Vignette, EffectType.VignetteBlur ]);
  useEffect(() => {
    if (renderer !== undefined) {
      setBackgroundEffects(renderer.background, effects);
    }
  }, [effects, index, renderer]);

  const onNextBackground = () => {
    if (renderer !== undefined && !renderer.isTransitioning()) {
      setIndex((index + 1) % images.length);
    }
  };

  const onPrevBackground = () => {
    if (renderer !== undefined && !renderer.isTransitioning()) {
      setIndex(index - 1 < 0 ? images.length - 1 : index - 1);
    }
  };

  const onCameraMove = () => {
    if (renderer !== undefined) {
      const { camera } = renderer.background;
      if (!camera.isMoving() && !camera.isRotating()) {
        camera.move({ x: Math.random(), y: Math.random(), z: 0.5 + Math.random() * 0.5 }, {
          duration: 2.5,
          easing: Easings.Cubic.InOut,
        });
        camera.rotate(-5 + Math.random() * 10, {
          duration: 2.5,
          easing: Easings.Cubic.InOut,
        });
      }
    }
  };

  const onTransitionSet = (transitionType: TransitionType) => {
    setTransition(transitionType);
  }

  const onEffectSet = (effectType: EffectType) => {
    if (effects.includes(effectType)) {
      setEffects(effects.filter(x => x !== effectType));
    } else {
      setEffects([ ...effects, effectType ]);
    }
  };

  const { source, title, artist, profile } = images[index];
  return (
    <>
      <canvas ref={setCanvasRef} className='canvas'/>
      <div className='content'>
        <Section
          className='content-header page-header'
          label='midori'
          rule={true}
          icon={
            <a className='github-ref' href='https://github.com/aeroheim/midori' target='_blank' rel="noreferrer">
              <svg className='nav-icon github-icon' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          }>
          <span>library for animated image backgrounds</span>
        </Section>
        <Section label='images' rule={true}>
          <span>example image backgrounds</span>
          <div className='images-layout'>
            <h2 className='index'>{`${index + 1}/${images.length}`}</h2>
            <a className='link title' href={source} target='_blank' rel="noreferrer">{title}</a>
            <a className='link artist' href={profile} target='_blank' rel="noreferrer">{artist}</a>
            <nav className='nav'>
              <svg onClick={onPrevBackground} className='nav-icon' xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/><path d="M0 0h24v24H0z" fill="none"/>
              </svg>
              <svg onClick={onNextBackground} className='nav-icon' xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/><path d="M0 0h24v24H0z" fill="none"/>
              </svg>
              <svg onClick={onCameraMove} className='nav-icon' xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M5 15H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zM12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
            </nav>
          </div>
        </Section>
        <Section label='transitions' rule={true}>
          <span>animated transitions between backgrounds</span>
          <div className='options-layout'>
            {[ TransitionType.Blend, TransitionType.Wipe, TransitionType.Blur, TransitionType.Slide, TransitionType.Glitch ].map(transitionType => (
              <div
                key={transitionType}
                className={`select-item ${transitionType === transition ? 'select-item-active' : ''}`}
                onClick={() => onTransitionSet(transitionType)}
              >
                {transitionType}
              </div>
            ))}
          </div>
        </Section>
        <Section label='effects'>
          <span>post-processing effects for backgrounds</span>
          <div className='options-layout'>
            {[ EffectType.Bloom, EffectType.Blur, EffectType.MotionBlur, EffectType.RgbShift, EffectType.Vignette, EffectType.VignetteBlur ].map(effectType => (
              <div
                key={effectType}
                className={`select-item ${effects.includes(effectType) ? 'select-item-active' : ''}`}
                onClick={() => onEffectSet(effectType)}
              >
                {getEffectTypeString(effectType)}
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}

Promise.all([
  loadImage('assets/0.jpg').then(image => ({ 
    image,
    title: '夜を歩いて',
    artist: 'みふる',
    profile: 'https://www.pixiv.net/en/users/488766',
    source: 'https://www.pixiv.net/en/artworks/71306825',
  })),
  loadImage('assets/1.jpg').then(image => ({
    image,
    title: '「何考えてるんです？」',
    artist: 'ちた',
    profile: 'https://www.pixiv.net/en/users/6437284',
    source: 'https://www.pixiv.net/en/artworks/78237071',
  })),
  loadImage('assets/2.jpg').then(image => ({
    image,
    title: 'Midnight Stroll',
    artist: 'Wenqing Yan',
    profile: 'https://www.yuumeiart.com/',
    source: 'https://www.yuumeiart.com/#/midnight-stroll/',
  })),
])
.then(images => {
  ReactDOM.render(<Example images={images}/>, document.getElementById('root'));
})
.catch(e => console.error(`Failed to load assets: ${e}`));
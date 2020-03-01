import React from 'react';
import ReactDOM from 'react-dom';
import { BackgroundRenderer, loadImage, TransitionType, EffectType, Easings, WipeDirection, SlideDirection } from '../dist/midori';

function getTransitionConfig(type) {
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

function setEffects(background, effects) {
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

function setParticles(background) {
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
  particles.move('small', { distance: 0.5, angle: 25 }, { duration: 5, loop: true });
  particles.move('medium', { distance: 0.3, angle: 45 }, { duration: 5, loop: true });
  particles.move('large', { distance: 0.4, angle: 35 }, { duration: 5, loop: true });
  particles.sway('small', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: Easings.Sinusoidal.InOut, loop: true });
  particles.sway('medium', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: Easings.Sinusoidal.InOut, loop: true });
  particles.sway('large', { x: 0.025, y: 0.025 }, { duration: 1.5, easing: Easings.Sinusoidal.InOut, loop: true });
}

function getEffectTypeString(effectType) {
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

class Examples extends React.Component {
  constructor(props) {
    super(props);
    this.canvas = React.createRef();
    this.state = {
      index: 0,
      transition: TransitionType.Wipe,
      effects: [ EffectType.Bloom, EffectType.MotionBlur, EffectType.Vignette, EffectType.VignetteBlur ],
    }
  }

  componentDidMount() {
    const { images } = this.props;
    const { index, transition } = this.state;
    this.renderer = new BackgroundRenderer(this.canvas.current);
    this.setBackground(images[index].image, transition);
  }

  componentWillUnmount() {
    this.background.dispose();
  }

  componentDidUpdate(prevProps, prevState) {
    const { images } = this.props;
    const { index, transition, effects } = this.state;
    const { index: prevIndex, effects: prevEffects } = prevState;
    if (index !== prevIndex) {
      this.setBackground(images[index].image, transition);
    }
    if (effects !== prevEffects) {
      const { background } = this.renderer;
      setEffects(background, effects);
    }
  }

  setBackground(texture, transitionType) {
    const delay = 1.25;
    this.renderer.setBackground(texture, {
      type: transitionType,
      config: {
        ...getTransitionConfig(transitionType),
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

    const { background } = this.renderer;
    const { effects } = this.state;
    setEffects(background, effects);
    setParticles(background);
  }

  onNextBackground() {
    if (!this.renderer.isTransitioning()) {
      const { index } = this.state;
      const { images } = this.props;
      this.setState({ index: (index + 1) % images.length });
    }
  }

  onPrevBackground() {
    if (!this.renderer.isTransitioning()) {
      const { index } = this.state;
      const { images } = this.props;
      this.setState({ index: index - 1 < 0 ? images.length - 1 : index - 1 });
    }
  }

  onPan() {
    const { camera } = this.renderer.background;
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

  onSetTransition(transition) {
    this.setState({ transition });
  }

  onSetEffect(effect) {
    if (!this.renderer.isTransitioning()) {
      const { effects } = this.state;
      if (effects.includes(effect)) {
        this.setState({ effects: effects.filter(x => x !== effect) });
      } else {
        this.setState({ effects: [ ...effects, effect ]});
      }
    }
  }

  render() {
    const { images } = this.props;
    const { index, transition, effects } = this.state;
    const image = images[index];
    return (
      <>
        <canvas ref={this.canvas} className='canvas'/>
        <div className='content'>
          <Section insertRule className='content-header' label='midori'>
            <span>library for animated image backgrounds</span>
          </Section>
          <Section insertRule label='images'>
            <span>example image backgrounds</span>
            <div className='images-layout'>
              <h2 className='index'>{`${index + 1}/${images.length}`}</h2>
              <a className='title' href={image.source} target='_blank'>{image.title}</a>
              <span className='artist'>{image.artist}</span>
              <nav className='nav'>
                <svg onClick={() => this.onPrevBackground()} className='nav-icon' xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                  <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/><path d="M0 0h24v24H0z" fill="none"/>
                </svg>
                <svg onClick={() => this.onNextBackground()} className='nav-icon' xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                  <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/><path d="M0 0h24v24H0z" fill="none"/>
                </svg>
                <svg onClick={() => this.onPan()} className='nav-icon' xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                  <path d="M0 0h24v24H0z" fill="none"/>
                  <path d="M5 15H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zM12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              </nav>
            </div>
          </Section>
          <Section insertRule label='transitions'>
            <span>animated transitions between backgrounds</span>
            <div className='options-layout'>
              {[ TransitionType.Blend, TransitionType.Wipe, TransitionType.Blur, TransitionType.Slide, TransitionType.Glitch ].map(transitionType => (
                <div
                  key={transitionType}
                  onClick={() => this.onSetTransition(transitionType)}
                  className={`select-item ${transitionType === transition ? 'select-item-active' : ''}`}
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
                  onClick={() => this.onSetEffect(effectType)}
                  className={`select-item ${effects.includes(effectType) ? 'select-item-active' : ''}`}
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
}

class Section extends React.Component {
  render() {
    const { className, label, insertRule, children } = this.props;
    return (
      <>
        <div className={className}>
          <h1 className='section-header'>{label}</h1>
          {children}
        </div>
        {insertRule ? <hr className='rule'/> : null}
      </>
    );
  }
}

Promise.all([
  loadImage('assets/0.jpg').then(image => ({ image, title: '夜を歩いて', artist: 'みふる', source: 'https://www.pixiv.net/en/artworks/71306825' })),
  loadImage('assets/1.jpg').then(image => ({ image, title: '「何考えてるんです？」', artist: 'ちた', source: 'https://www.pixiv.net/en/artworks/78237071' })),
  loadImage('assets/2.jpg').then(image => ({ image, title: 'Midnight Stroll', artist: 'Wenqing Yan', source: 'https://www.yuumeiart.com/#/midnight-stroll/' })),
])
.then(images => ReactDOM.render(
  <Examples images={images}/>,
  document.getElementById('root'),
))
.catch(e => console.error(`Failed to load assets: ${e}`));
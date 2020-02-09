import TWEEN from '@tweenjs/tween.js';
import { Renderer, loadImage } from './renderer';

let renderer;

let image = 0;
const imageCount = 3;

function render(time) {
  TWEEN.update(time);
  renderer.render();
  requestAnimationFrame(render); // TODO consider using renderer.setAnimationLoop() instead
}

function init() {
  renderer = new Renderer(document.getElementById('container'));
  loadImage(`images/${image}.png`)
    .then((texture) => {
      renderer.setBackground(texture);
      render();
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

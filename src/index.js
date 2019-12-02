import TWEEN from '@tweenjs/tween.js';
import { Renderer } from './renderer';
import { Background } from './background';

let renderer;

let image = 0;
const imageCount = 3;

function render(time) {
  renderer.render();
  TWEEN.update(time);
  requestAnimationFrame(render); // TODO consider using renderer.setAnimationLoop() instead
}

function init() {
  renderer = new Renderer(document.getElementById('container'));
  Background.loadBackground(`images/${image}.png`)
    .then((bg) => {
      renderer.setBackground(bg);
      render();
    })
    .catch(e => console.log(e));
}

// init renderer
window.onload = init;
window.onkeyup = (e) => {
  if (e.key === 'ArrowLeft') {
    const newIndex = (((image - 1) % imageCount) + imageCount) % imageCount;
    Background.loadBackground(`images/${newIndex}.png`)
      .then((bg) => {
        renderer.setBackground(bg);
        image = newIndex;
      })
      .catch(e => console.log(e));
  } else if (e.key === 'ArrowRight') {
    Background.loadBackground(`images/${(image + 1) % imageCount}.png`)
      .then((bg) => {
        renderer.setBackground(bg);
        image = (image + 1) % imageCount;
      })
      .catch(e => console.log(e));
  } else if (e.key === ' ') {
    renderer.test();
  }
};

import TWEEN from '@tweenjs/tween.js';
import { Renderer } from './renderer';
import { loadImageAsTexture } from './background';

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
  loadImageAsTexture(`images/${image}.png`)
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
    const newIndex = (((image - 1) % imageCount) + imageCount) % imageCount;
    loadImageAsTexture(`images/${newIndex}.png`)
      .then((texture) => {
        renderer.setBackground(texture);
        image = newIndex;
      })
      .catch(e => console.log(e));
  } else if (e.key === 'ArrowRight') {
    loadImageAsTexture(`images/${(image + 1) % imageCount}.png`)
      .then((texture) => {
        renderer.setBackground(texture);
        image = (image + 1) % imageCount;
      })
      .catch(e => console.log(e));
  } else if (e.key === ' ') {
    renderer.test();
  }
};

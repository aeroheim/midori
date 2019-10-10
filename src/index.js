import TWEEN from '@tweenjs/tween.js';
import Renderer from './renderer';
import Background from './background';

let renderer;

let image = 0;

function toggleImage() {
  image = (image + 1) % 2;
}

function render(time) {
  renderer.render();
  TWEEN.update(time);
  requestAnimationFrame(render); // TODO consider using renderer.setAnimationLoop() instead
}

function init() {
  renderer = new Renderer(document.getElementById('container'));
  Background.loadBackground(`images/${image}.jpg`)
    .then((bg) => {
      if (renderer.setBackground(bg)) {
        toggleImage();
      }
      render();
    })
    .catch(e => console.log(e));
}

// init renderer
window.onload = init;
window.onmouseup = () => {
  Background.loadBackground(`images/${image}.jpg`)
    .then((bg) => {
      if (renderer.setBackground(bg)) {
        toggleImage();
      }
    })
    .catch(e => console.log(e));
};

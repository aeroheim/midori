import Renderer from './renderer';
import Background from './background';

let renderer;

function render() {
  renderer.render();
  requestAnimationFrame(render);
}

function init() {
  renderer = new Renderer(document.getElementById('container'));
  Background.loadBackground('images/1.jpg')
    .then((bg) => {
      renderer.setBackground(bg);
      console.log(bg);
      render();
    })
    .catch((reason, error) => console.log(`error: ${error} - ${reason}`));
}

// init renderer
window.onload = init;

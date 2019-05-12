import { Renderer, loadImage } from './renderer';

let renderer;

function render() {
  renderer.render();
  requestAnimationFrame(render);
}

function init() {
  renderer = new Renderer(document.getElementById('container'));

  loadImage('images/1.jpg')
    .then((texture) => {
      renderer.setImage(texture);
      render();
    })
    .catch((reason, error) => {
      // eslint-disable-next-line no-console
      console.log(`error: ${error} - ${reason}`);
    });
}

// init renderer
window.onload = init;

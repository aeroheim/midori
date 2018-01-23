import { Renderer, loadImage } from './renderer';

let renderer;

function init()
{
    renderer = new Renderer(document.getElementById('container'));

    loadImage('images/1.jpg')
    .then((texture) =>
    {
        renderer.setImage(texture);
        render();
    })
    .catch((reason, error) =>
    {
        console.log('error: ' + reason);
    });
}

function render()
{
    renderer.render()
    requestAnimationFrame(render);
}

// init renderer
window.onload = init;

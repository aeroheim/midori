import * as three from 'three';

// three.js OrbitControls export is broken; have to use a separate npm package of it ¯\_(ツ)_/¯
import * as OrbitControls from 'three-orbit-controls'; 
let OrbitControl = OrbitControls.default(three);

class Renderer
{
    scene;
    camera;
    renderer;
    parentDomElement;

    constructor(domElement)
    {
        this.renderer = new three.WebGLRenderer();
        this.renderer.domElement.id = 'midori';

        this.parentDomElement = domElement;
        this.parentDomElement.appendChild(this.renderer.domElement);

        this.scene = new three.Scene();
        this.camera = new three.PerspectiveCamera(35, domElement.clientWidth / domElement.clientHeight, 1, 1000);
        this.camera.position.z = 100;

        const light = new three.AmbientLight(0xffffff);
        const orbitControl = new OrbitControl(this.camera);

        this.scene.add(light);
        this.scene.add(this.camera);
        this.scene.add(new three.AxisHelper(1000));

        this.resize();
        window.onresize = this.resize;
    }

    render = () =>
    {
        this.renderer.render(this.scene, this.camera);
    }

    resize = () =>
    {
        this.renderer.setSize(this.parentDomElement.clientWidth, this.parentDomElement.clientHeight);
        this.camera.aspect = this.parentDomElement.clientWidth / this.parentDomElement.clientHeight;

        // must call this each time after updating camera
        this.camera.updateProjectionMatrix();
    }

    setImage = (texture) =>
    {
        const imageAspect = texture.image.width / texture.image.height;
        let plane = new three.Mesh(new three.PlaneGeometry(100, 100 / imageAspect), new three.MeshBasicMaterial({ map: texture }));
        plane.name = 'plane';
        plane.add(new three.AxisHelper(50));

        this.scene.add(plane);
    }
}

/**
 * Loads an image as a texture.
 * @async
 * @param {string} path - path to the image file.
 * @return {Promise} - texture on success, error on failure.
 */
function loadImage(path)
{
    return new Promise((resolve, reject) =>
    {
        let texture = new three.TextureLoader().load(path, (texture) =>
        {
            // image should never wrap
            texture.wrapS = three.ClampToEdgeWrapping;
            texture.wrapT = three.ClampToEdgeWrapping;

            // image should be able to be UV mapped directly
            texture.minFilter = three.LinearFilter;

            // image should never repeat
            texture.repeat.set(1, 1);
        
            resolve(texture);
        },
        () => {},
        (error) => reject('Failed to load texture.', error));
    });
}

export { Renderer, loadImage };
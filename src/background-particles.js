
class BackgroundParticles {
  _particles;
  _geometry;
  _material;

  constructor() {
    /*
      this._geometry = new BufferGeometry();
      const vertices = [];
      vertices.push(-0.1, -0.1, 0);
      vertices.push(0, 0, 0.1);
      vertices.push(0.1, 0.1, 0.1);
      this._geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
      this._material = new PointsMaterial({ size: 0.01, map: texture });
      this._material.color.setHSL(1.0, 0.3, 0.7);
      this._particles = new Points(this._geometry, this._material);
    */
  }
}

export {
  BackgroundParticles,
};

export default BackgroundParticles;

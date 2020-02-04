import { ShaderMaterial, UniformsUtils } from 'three';

/**
 * Returns a new ShaderMaterial given a shader definition and uniforms.
 * @param {Object} shader - an object defining a shader.
 * @param {Object} shader.uniforms - a map that defines the uniforms of the given shader
 * @param {string} shader.vertexShader - a string that defines the vertex shader program
 * @param {string} shader.fragmentShader - a string that defines the fragment shader program
 * @param {Object} uniforms - a map that defines the values of the uniforms to be used
 */
function createShaderMaterial(shader, uniforms = {}) {
  const material = new ShaderMaterial({
    uniforms: UniformsUtils.clone(shader.uniforms),
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
  });

  updateUniforms(material, uniforms);
  return material;
}

/**
 * Returns the values of the uniforms for a given ShaderMaterial.
 * @param {ShaderMaterial} shader - a ShaderMaterial object.
 */
function getUniforms(shader) {
  const uniforms = {};
  for (const uniform in shader.uniforms) {
    uniforms[uniform] = shader.uniforms[uniform].value;
  }

  return uniforms;
}

/**
 * Updates the uniforms for a given ShaderMaterial.
 * @param {ShaderMaterial} shader - a ShaderMaterial object.
 * @param {Object} uniforms - a map that defines the values of the uniforms to be used
 */
function updateUniforms(shader, uniforms = {}) {
  for (const uniform in uniforms) {
    if (!shader.uniforms[uniform]) {
      throw new Error(`Uniform "${uniform}" does not exist on shader "${shader.name}"`);
    }
    shader.uniforms[uniform].value = uniforms[uniform];
  }
}

/**
 * Resets the uniforms for a given ShaderMaterial.
 * @param {ShaderMaterial} shader - a ShaderMaterial object.
 */
function clearUniforms(shader) {
  shader.uniforms = UniformsUtils.clone(shader.uniforms);
}



const ShaderUtils = {
  createShaderMaterial,
  getUniforms,
  updateUniforms,
  clearUniforms,
};

export {
  ShaderUtils,
};

export default ShaderUtils;

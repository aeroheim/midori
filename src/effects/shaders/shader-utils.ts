import { ShaderMaterial, UniformsUtils, Shader } from 'three';

type Uniforms = {[uniform: string]: any};

/**
 * Returns the values of the uniforms for a given ShaderMaterial.
 * @param {ShaderMaterial} shader - a ShaderMaterial object.
 */
function getUniforms(shader: ShaderMaterial): Uniforms {
  const uniforms: Uniforms = {};
  for (const uniform in shader.uniforms) {
    uniforms[uniform] = shader.uniforms[uniform].value;
  }
  return uniforms;
}

/**
 * Updates the uniforms for a given ShaderMaterial.
 * @param {ShaderMaterial} shader - a ShaderMaterial object.
 * @param {Uniforms} uniforms - a map that defines the values of the uniforms to be used
 */
function updateUniforms(shader: ShaderMaterial, uniforms: Uniforms = {}): void {
  for (const uniform in uniforms) {
    if (shader.uniforms[uniform] === undefined) {
      throw new Error(`Uniform "${uniform}" does not exist on shader "${shader.name}"`);
    }
    shader.uniforms[uniform].value = uniforms[uniform];
  }
}

/**
 * Resets the uniforms for a given ShaderMaterial.
 * @param {ShaderMaterial} shader - a ShaderMaterial object.
 */
function clearUniforms(shader: ShaderMaterial): void {
  shader.uniforms = UniformsUtils.clone(shader.uniforms);
}

/**
 * Returns a new ShaderMaterial given a shader definition and uniforms.
 * @param {Shader} shader - a shader definition.
 * @param {Uniforms} uniforms - uniforms for the shader.
 */
function createShaderMaterial(shader: Shader, uniforms: Uniforms = {}): ShaderMaterial {
  const material = new ShaderMaterial({
    uniforms: UniformsUtils.clone(shader.uniforms),
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
  });
  updateUniforms(material, uniforms);
  return material;
}

const ShaderUtils = {
  getUniforms,
  updateUniforms,
  clearUniforms,
  createShaderMaterial,
};

export {
  Uniforms,
  ShaderUtils,
};

export default ShaderUtils;

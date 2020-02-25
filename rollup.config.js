import resolve from '@rollup/plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import filesize from 'rollup-plugin-filesize';
import { eslint } from 'rollup-plugin-eslint';
import { terser } from 'rollup-plugin-terser';

const production = process.env.BUILD === 'production';
const extensions = ['.js', '.ts'];
const plugins = [
  resolve({ extensions }),
  eslint(),
  babel({
    extensions,
    exclude: 'node_modules/**',
    presets: [
      ['@babel/preset-env', { "modules": false }],
      '@babel/preset-typescript',
    ],
    plugins: ['@babel/plugin-proposal-class-properties'],
  })
];

export default [
  // lib
  {
    input: 'src/midori.ts',
    output: {
      file: 'dist/midori.js',
      format: 'esm',
      sourcemap: 'true',
    },
    plugins: [
      ...plugins,
      ...production ? [ terser() ] : [],
      filesize(),
    ],
  },
  // docs
  {
    input: 'docs/index.js',
    output: {
      file: 'docs/dist/index.js',
      format: 'esm',
      sourcemap: 'true',
    },
    plugins: [
      ...plugins,
      ...!production ? [ serve({ contentBase: 'docs', port: 8080 }), livereload() ] : [],
    ],
  },
];

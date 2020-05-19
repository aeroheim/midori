import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import filesize from 'rollup-plugin-filesize';
import { eslint } from 'rollup-plugin-eslint';
import { terser } from 'rollup-plugin-terser';

const production = process.env.BUILD === 'production';
const extensions = ['.js', '.jsx', '.ts', '.tsx'];
const plugins = ({ docs } = {}) => [
  resolve({ extensions }),
  commonjs(),
  eslint(),
  babel({
    extensions,
    exclude: 'node_modules/**',
    presets: [
      ['@babel/preset-env', { "modules": false }],
      '@babel/preset-typescript',
      ...docs ? [ '@babel/preset-react' ] : [],
    ],
    babelHelpers: 'bundled',
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
    },
    plugins: [
      ...plugins(),
      ...production ? [ terser() ] : [],
      filesize(),
    ],
  },
  // docs
  {
    input: 'docs/index.jsx',
    output: {
      file: 'docs/dist/index.js',
      format: 'esm',
    },
    plugins: [
      // rollup quirk - react reads from process.env which rollup does not set
      replace({ 'process.env.NODE_ENV': JSON.stringify(process.env.BUILD)}),
      ...plugins({ docs: true }),
      ...production
        ? [ terser() ]
        : [ serve({ contentBase: 'docs', port: 8080 }), livereload() ],
    ],
  },
];

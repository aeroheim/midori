const path = require('path');
const ThreeMinifierPlugin = require('@yushijinhun/three-minifier-webpack');
const EsmWebpackPlugin = require('@purtuga/esm-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const threeMinifier = new ThreeMinifierPlugin();

module.exports = (env, { mode = 'development' }) => ({
  entry: './src/midori.ts',
  output: {
    library: 'midori',
    libraryTarget: 'var',
    filename: 'midori.js',
    path: path.resolve('lib'),
  },
  plugins: [
    threeMinifier,
    new EsmWebpackPlugin(),
    new CompressionPlugin(),
  ],
  resolve: {
    plugins: [ threeMinifier.resolver ],
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        sideEffects: false, // for tree-shaking - the codebase is pure (i.e no global logic on import)
        test: /\.(j|t)s$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    "targets": { "esmodules": true },
                    "modules": false,
                  }
                ],
                '@babel/preset-typescript',
              ],
              plugins: [
                '@babel/plugin-transform-runtime', // needed for async functions
                '@babel/plugin-proposal-class-properties',
              ],
            },
          },
          {
            loader: 'eslint-loader',
            options: {
              emitWarning: true,
            },
          },
        ],
      },
    ],
  },
  devtool: mode === 'development'
    ? 'cheap-module-eval-source-map' // more accurate source map for debugging
    : 'source-map', // original source map for production
});

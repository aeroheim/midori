const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve('build'),
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
              ],
              plugins: [
                '@babel/plugin-proposal-object-rest-spread',
                '@babel/plugin-proposal-class-properties',
              ],
            },
          },
          {
            loader: 'eslint-loader',
          },
        ],
      },
    ],
  },
  devtool: 'cheap-module-eval-source-map', // more accurate source map for debugging
};

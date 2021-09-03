const { merge } = require('webpack-merge');
const { libConfig, docsConfig } = require('./webpack.config.js');

const devConfig = {
  mode: 'development',
  devtool: 'eval-source-map',
};

const libDevConfig = merge(libConfig, devConfig);
const docsDevConfig = merge(docsConfig, devConfig);

module.exports = {
  libConfig: libDevConfig,
  docsConfig: docsDevConfig,
  default: [
    libDevConfig,
    docsDevConfig,
  ]
};

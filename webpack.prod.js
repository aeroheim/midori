const { merge } = require('webpack-merge');
const { libConfig, docsConfig } = require('./webpack.config.js');

const prodConfig = {
  mode: 'production',
  devtool: 'source-map',
};

const libProdConfig = merge(libConfig, prodConfig);
const docsProdConfig = merge(docsConfig, prodConfig);

module.exports = {
  libConfig: libProdConfig,
  docsConfig: docsProdConfig,
  default: [
    libProdConfig,
    docsProdConfig,
  ]
};

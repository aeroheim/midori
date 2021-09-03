const path = require('path');
const ESLintWebpackPlugin = require('eslint-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const extensions = ['.js', '.jsx', '.ts', '.tsx'];

const libConfig = {
  name: 'lib',
  entry: './src/midori.ts',
  output: {
    filename: 'midori.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'midori',
      type: 'umd',
    },
  },
  resolve: { extensions },
  externals: [
    'three',
    /^three\/.+$/,
  ],
  module: {
    rules: [
      {
        test: /\.(j|t)s$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env', '@babel/preset-typescript'],
          plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-transform-runtime'],
        }
      }
    ]
  },
  plugins: [
    new ESLintWebpackPlugin({ files: 'src/', extensions, emitWarning: true }),
    new BundleAnalyzerPlugin({ openAnalyzer: false, analyzerMode: 'static' }),
  ],
};

const docsConfig = {
  name: 'docs',
  entry: './docs/index.jsx',
  output: {
    filename: 'dist/index.js',
    path: path.resolve(__dirname, 'docs'),
  },
  resolve: { extensions },
  module: {
    rules: [
      {
        test: /\.(j|t)sx$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env', '@babel/preset-typescript', '@babel/preset-react'],
          plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-transform-runtime'],
        }
      },
    ]
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'docs'),
    }
  },
  plugins: [ new ESLintWebpackPlugin({ files: 'docs/', extensions, emitWarning: true }) ],
};

module.exports = {
  libConfig,
  docsConfig,
};

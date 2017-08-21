const path = require('path');

module.exports = 
{
    entry: 
    [
        // entry point for this app
        './src/index.js',
    ],

    output:
    {
        filename: 'bundle.js',
        path: path.resolve('build'),
        publicPath: '/',
    },

    // more accurate source map for debugging
    devtool: 'cheap-module-eval-source-map',
}


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

    module:
    {
        rules:
        [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use:
                [
                    { 
                        loader: 'babel-loader',
                        options:
                        {
                            presets: [ 'es2015' ],
                            plugins: [ require('babel-plugin-transform-class-properties') ]
                        }
                    }
                ]
            }
        ]
    },

    // more accurate source map for debugging
    devtool: 'cheap-module-eval-source-map',
}

